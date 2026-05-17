import type { SampleStatistics } from "@/domain/statistics";

export type StatColumn = {
  readonly label: string;
  readonly stats: SampleStatistics;
};

type Props = {
  columns: ReadonlyArray<StatColumn>;
};

const fmt = (n: number): string => {
  if (!Number.isFinite(n)) return "—";
  const abs = Math.abs(n);
  if (abs !== 0 && (abs < 1e-3 || abs >= 1e5)) return n.toExponential(4);
  return n.toPrecision(6).replace(/\.?0+$/, "");
};

const ROWS: ReadonlyArray<{
  readonly label: string;
  readonly pick: (s: SampleStatistics) => number;
}> = [
  { label: "mean", pick: (s) => s.mean },
  { label: "median", pick: (s) => s.median },
  { label: "std dev", pick: (s) => s.stddev },
  { label: "n", pick: (s) => s.count },
];

export const MultiStatisticsTable = ({ columns }: Props) => (
  <table className="w-full border-collapse text-sm">
    <thead>
      <tr className="bg-ink text-paper">
        <th className="px-3 py-1 text-left font-bold uppercase tracking-widest">
          stat
        </th>
        {columns.map((c, i) => (
          <th
            key={i}
            className="px-3 py-1 text-right font-bold uppercase tracking-widest"
          >
            {c.label}
          </th>
        ))}
      </tr>
    </thead>
    <tbody className="font-mono">
      {ROWS.map((row) => (
        <tr key={row.label} className="border-t-2 border-ink">
          <td className="px-3 py-1">{row.label}</td>
          {columns.map((c, i) => (
            <td key={i} className="px-3 py-1 text-right">
              {fmt(row.pick(c.stats))}
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  </table>
);
