import { useMemo } from "react";

import type { TimeSeries } from "@/domain/timeseries";

export type LineGroup = {
  readonly color: string;
  readonly series: ReadonlyArray<TimeSeries>;
};

export type LegendEntry = {
  readonly color: string;
  readonly label: string;
};

type Props = {
  series?: ReadonlyArray<TimeSeries>;
  groups?: ReadonlyArray<LineGroup>;
  legend?: ReadonlyArray<LegendEntry>;
  showTicks?: boolean;
  width: number;
  height: number;
  className?: string;
};

const PAD_X = 36;
const PAD_Y = 12;

const computeBounds = (groups: ReadonlyArray<LineGroup>) => {
  let xMin = Infinity;
  let xMax = -Infinity;
  let yMin = Infinity;
  let yMax = -Infinity;
  for (const g of groups) {
    for (const s of g.series) {
      for (const t of s.times) {
        if (t < xMin) xMin = t;
        if (t > xMax) xMax = t;
      }
      for (const v of s.values) {
        if (v < yMin) yMin = v;
        if (v > yMax) yMax = v;
      }
    }
  }
  if (!Number.isFinite(xMin) || !Number.isFinite(yMin)) return null;
  if (yMin === yMax) {
    yMin -= 1;
    yMax += 1;
  }
  if (xMin === xMax) {
    xMax = xMin + 1;
  }
  return { xMin, xMax, yMin, yMax };
};

const formatTick = (n: number): string => {
  if (!Number.isFinite(n)) return "";
  const abs = Math.abs(n);
  if (abs !== 0 && (abs < 1e-3 || abs >= 1e5)) return n.toExponential(2);
  return n.toPrecision(4).replace(/\.?0+$/, "");
};

const strokeOpacity = (count: number): number =>
  Math.max(0.06, Math.min(0.5, 8 / Math.max(8, count)));

export const LineChart = ({
  series,
  groups,
  legend,
  showTicks = true,
  width,
  height,
  className,
}: Props) => {
  const resolved = useMemo<ReadonlyArray<LineGroup>>(
    () => groups ?? [{ color: "currentColor", series: series ?? [] }],
    [groups, series],
  );
  const bounds = useMemo(() => computeBounds(resolved), [resolved]);

  const drawn = useMemo(() => {
    if (!bounds) return [];
    const innerW = width - PAD_X * 2;
    const innerH = height - PAD_Y * 2;
    const { xMin, xMax, yMin, yMax } = bounds;
    const sx = innerW / (xMax - xMin);
    const sy = innerH / (yMax - yMin);
    const out: Array<{ d: string; color: string; opacity: number }> = [];
    for (const g of resolved) {
      const opacity = strokeOpacity(g.series.length);
      for (const s of g.series) {
        const len = Math.min(s.times.length, s.values.length);
        if (len === 0) continue;
        let d = "";
        for (let i = 0; i < len; i += 1) {
          const t = s.times[i] ?? 0;
          const v = s.values[i] ?? 0;
          const x = PAD_X + (t - xMin) * sx;
          const y = PAD_Y + innerH - (v - yMin) * sy;
          d += `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)} `;
        }
        out.push({ d, color: g.color, opacity });
      }
    }
    return out;
  }, [bounds, resolved, width, height]);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      height="100%"
      preserveAspectRatio="none"
      className={className}
      role="img"
      aria-label="sample paths"
    >
      {bounds ? (
        <>
          {showTicks ? (
            <>
              <text
                x={4}
                y={PAD_Y + 4}
                fontSize={10}
                fontWeight={600}
                fill="currentColor"
                dominantBaseline="hanging"
              >
                {formatTick(bounds.yMax)}
              </text>
              <text
                x={4}
                y={height - PAD_Y - 4}
                fontSize={10}
                fontWeight={600}
                fill="currentColor"
              >
                {formatTick(bounds.yMin)}
              </text>
            </>
          ) : null}
          {drawn.map((p, i) => (
            <path
              key={i}
              d={p.d}
              fill="none"
              stroke={p.color}
              strokeWidth={1}
              strokeOpacity={p.opacity}
            />
          ))}
          {legend?.map((e, i) => (
            <g
              key={i}
              transform={`translate(${PAD_X + 4} ${PAD_Y + 4 + i * 13})`}
            >
              <line
                x1={0}
                x2={14}
                y1={0}
                y2={0}
                stroke={e.color}
                strokeWidth={3}
              />
              <text
                x={19}
                y={0}
                fontSize={10}
                fontWeight={700}
                fill="currentColor"
                dominantBaseline="middle"
              >
                {e.label}
              </text>
            </g>
          ))}
        </>
      ) : null}
    </svg>
  );
};
