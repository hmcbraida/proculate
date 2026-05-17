import { useId, useMemo } from "react";

import type { LegendEntry } from "@/ui/LineChart";

type Marker = {
  readonly label: string;
  readonly value: number;
};

export type SampleGroup = {
  readonly color: string;
  readonly samples: ReadonlyArray<number>;
};

type Props = {
  samples?: ReadonlyArray<number>;
  groups?: ReadonlyArray<SampleGroup>;
  legend?: ReadonlyArray<LegendEntry>;
  markers?: ReadonlyArray<Marker>;
  width: number;
  height: number;
  className?: string;
};

const PAD_X = 36;
const PAD_Y = 16;

const formatTick = (n: number): string => {
  if (!Number.isFinite(n)) return "";
  const abs = Math.abs(n);
  if (abs !== 0 && (abs < 1e-3 || abs >= 1e5)) return n.toExponential(2);
  return n.toPrecision(4).replace(/\.?0+$/, "");
};

type MultiHistogram = {
  readonly xs: ReadonlyArray<number>;
  readonly counts: ReadonlyArray<ReadonlyArray<number>>;
  readonly xMin: number;
  readonly xMax: number;
  readonly yMax: number;
};

const histogram = (
  groups: ReadonlyArray<SampleGroup>,
): MultiHistogram | null => {
  let lo = Infinity;
  let hi = -Infinity;
  let total = 0;
  for (const g of groups) {
    for (const s of g.samples) {
      if (s < lo) lo = s;
      if (s > hi) hi = s;
      total += 1;
    }
  }
  if (total === 0 || !Number.isFinite(lo) || !Number.isFinite(hi)) return null;
  if (lo === hi) {
    lo -= 0.5;
    hi += 0.5;
  }
  const bins = Math.ceil(Math.log2(total) + 1);
  const w = (hi - lo) / bins;
  const counts: number[][] = [];
  let yMax = 0;
  for (const g of groups) {
    const c = new Array<number>(bins).fill(0);
    for (const s of g.samples) {
      let idx = Math.floor((s - lo) / w);
      if (idx < 0) idx = 0;
      if (idx >= bins) idx = bins - 1;
      c[idx] = (c[idx] ?? 0) + 1;
    }
    for (const v of c) if (v > yMax) yMax = v;
    counts.push(c);
  }
  const xs = new Array<number>(bins);
  for (let i = 0; i < bins; i += 1) xs[i] = lo + (i + 0.5) * w;
  return { xs, counts, xMin: lo, xMax: hi, yMax };
};

const cubicSmooth = (pts: ReadonlyArray<readonly [number, number]>): string => {
  if (pts.length === 0) return "";
  if (pts.length === 1) {
    const [x, y] = pts[0]!;
    return `M${x.toFixed(2)},${y.toFixed(2)}`;
  }
  let d = `M${pts[0]![0].toFixed(2)},${pts[0]![1].toFixed(2)}`;
  const tension = 0.5;
  for (let i = 0; i < pts.length - 1; i += 1) {
    const p0 = pts[i - 1] ?? pts[i]!;
    const p1 = pts[i]!;
    const p2 = pts[i + 1]!;
    const p3 = pts[i + 2] ?? p2;
    const c1x = p1[0] + ((p2[0] - p0[0]) / 6) * tension;
    const c1y = p1[1] + ((p2[1] - p0[1]) / 6) * tension;
    const c2x = p2[0] - ((p3[0] - p1[0]) / 6) * tension;
    const c2y = p2[1] - ((p3[1] - p1[1]) / 6) * tension;
    d += ` C${c1x.toFixed(2)},${c1y.toFixed(2)} ${c2x.toFixed(2)},${c2y.toFixed(2)} ${p2[0].toFixed(2)},${p2[1].toFixed(2)}`;
  }
  return d;
};

export const DistributionChart = ({
  samples,
  groups,
  legend,
  markers = [],
  width,
  height,
  className,
}: Props) => {
  const rawId = useId();
  const clipId = `dist-clip${rawId.replace(/:/g, "-")}`;

  const resolved = useMemo<ReadonlyArray<SampleGroup>>(
    () => groups ?? [{ color: "currentColor", samples: samples ?? [] }],
    [groups, samples],
  );
  const hist = useMemo(() => histogram(resolved), [resolved]);

  const layout = useMemo(() => {
    if (!hist) return null;
    const innerW = width - PAD_X * 2;
    const innerH = height - PAD_Y * 2;
    const sx = innerW / (hist.xMax - hist.xMin);
    const sy = innerH / Math.max(1, hist.yMax);
    const baselineY = PAD_Y + innerH;
    const curves = hist.counts.map((ys, gi) => {
      const pts: Array<readonly [number, number]> = [];
      pts.push([PAD_X, baselineY]);
      for (let i = 0; i < hist.xs.length; i += 1) {
        const x = PAD_X + (hist.xs[i]! - hist.xMin) * sx;
        const y = baselineY - ys[i]! * sy;
        pts.push([x, y]);
      }
      pts.push([PAD_X + innerW, baselineY]);
      return {
        d: cubicSmooth(pts),
        color: resolved[gi]?.color ?? "currentColor",
      };
    });
    return {
      curves,
      innerW,
      innerH,
      sx,
      baselineY,
      xMin: hist.xMin,
      xMax: hist.xMax,
    };
  }, [hist, resolved, width, height]);

  const markerLines = useMemo(() => {
    if (!layout || markers.length === 0) return [];
    const inRange = markers.filter(
      (m) =>
        Number.isFinite(m.value) &&
        m.value >= layout.xMin &&
        m.value <= layout.xMax,
    );
    if (inRange.length === 0) return [];
    const sorted = [...inRange].sort((a, b) => a.value - b.value);
    return sorted.map((m, idx) => {
      const x = PAD_X + (m.value - layout.xMin) * layout.sx;
      const side: "left" | "right" = idx < sorted.length / 2 ? "left" : "right";
      return { ...m, x, side };
    });
  }, [layout, markers]);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      height="100%"
      preserveAspectRatio="none"
      className={className}
      role="img"
      aria-label="distribution"
    >
      {layout ? (
        <>
          <defs>
            <clipPath id={clipId}>
              <rect
                x={PAD_X}
                y={PAD_Y}
                width={layout.innerW}
                height={layout.innerH}
              />
            </clipPath>
          </defs>
          {layout.curves.map((c, i) => (
            <path
              key={i}
              d={c.d}
              fill="none"
              stroke={c.color}
              strokeWidth={1.5}
              clipPath={`url(#${clipId})`}
            />
          ))}
          {markerLines.map((m, i) => (
            <g key={i}>
              <line
                x1={m.x}
                x2={m.x}
                y1={PAD_Y}
                y2={layout.baselineY}
                stroke="currentColor"
                strokeWidth={1}
                strokeDasharray="3 3"
              />
              <text
                x={m.side === "right" ? m.x + 4 : m.x - 4}
                y={PAD_Y + 10}
                fontSize={14}
                fontWeight={700}
                textAnchor={m.side === "right" ? "start" : "end"}
                fill="currentColor"
              >
                {`${m.label} ${formatTick(m.value)}`}
              </text>
            </g>
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
