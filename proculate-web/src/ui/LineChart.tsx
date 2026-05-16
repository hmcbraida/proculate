import { useMemo } from "react";

import type { TimeSeries } from "@/domain/timeseries";

type Props = {
  series: ReadonlyArray<TimeSeries>;
  width: number;
  height: number;
  className?: string;
};

const PAD_X = 36;
const PAD_Y = 12;

const computeBounds = (series: ReadonlyArray<TimeSeries>) => {
  let xMin = Infinity;
  let xMax = -Infinity;
  let yMin = Infinity;
  let yMax = -Infinity;
  for (const s of series) {
    for (const t of s.times) {
      if (t < xMin) xMin = t;
      if (t > xMax) xMax = t;
    }
    for (const v of s.values) {
      if (v < yMin) yMin = v;
      if (v > yMax) yMax = v;
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

export const LineChart = ({ series, width, height, className }: Props) => {
  const bounds = useMemo(() => computeBounds(series), [series]);

  const paths = useMemo(() => {
    if (!bounds) return [];
    const innerW = width - PAD_X * 2;
    const innerH = height - PAD_Y * 2;
    const { xMin, xMax, yMin, yMax } = bounds;
    const sx = innerW / (xMax - xMin);
    const sy = innerH / (yMax - yMin);
    const out: string[] = [];
    for (const s of series) {
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
      out.push(d);
    }
    return out;
  }, [bounds, series, width, height]);

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
          {paths.map((d, i) => (
            <path
              key={i}
              d={d}
              fill="none"
              stroke="currentColor"
              strokeWidth={1}
              strokeOpacity={Math.max(
                0.06,
                Math.min(0.5, 8 / Math.max(8, paths.length)),
              )}
            />
          ))}
        </>
      ) : null}
    </svg>
  );
};
