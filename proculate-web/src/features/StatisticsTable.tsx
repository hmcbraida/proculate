import type { SampleStatistics } from "@/domain/statistics";

type Props = {
  stats: SampleStatistics;
};

const fmt = (n: number): string => {
  if (!Number.isFinite(n)) return "—";
  const abs = Math.abs(n);
  if (abs !== 0 && (abs < 1e-3 || abs >= 1e5)) return n.toExponential(4);
  return n.toPrecision(6).replace(/\.?0+$/, "");
};

export const StatisticsTable = ({ stats }: Props) => (
  <table className="w-full border-collapse text-sm">
    <thead>
      <tr className="bg-ink text-paper">
        <th className="px-3 py-1 text-left font-bold uppercase tracking-widest">stat</th>
        <th className="px-3 py-1 text-right font-bold uppercase tracking-widest">value</th>
      </tr>
    </thead>
    <tbody className="font-mono">
      <tr className="border-t-2 border-ink">
        <td className="px-3 py-1">mean</td>
        <td className="px-3 py-1 text-right">{fmt(stats.mean)}</td>
      </tr>
      <tr className="border-t-2 border-ink">
        <td className="px-3 py-1">median</td>
        <td className="px-3 py-1 text-right">{fmt(stats.median)}</td>
      </tr>
      <tr className="border-t-2 border-ink">
        <td className="px-3 py-1">std dev</td>
        <td className="px-3 py-1 text-right">{fmt(stats.stddev)}</td>
      </tr>
      <tr className="border-t-2 border-ink">
        <td className="px-3 py-1">n</td>
        <td className="px-3 py-1 text-right">{stats.count}</td>
      </tr>
    </tbody>
  </table>
);
