import type { SampleStatistics } from "@/domain/statistics";
import { DistributionChart } from "@/ui/DistributionChart";

type Props = {
  samples: ReadonlyArray<number>;
  stats: SampleStatistics;
};

export const Distribution = ({ samples, stats }: Props) => {
  const markers =
    Number.isFinite(stats.mean) && Number.isFinite(stats.median)
      ? [
          { label: "mean", value: stats.mean },
          { label: "median", value: stats.median },
        ]
      : [];
  return (
    <div className="relative w-full h-72 text-ink">
      <DistributionChart
        samples={samples}
        markers={markers}
        width={800}
        height={300}
      />
    </div>
  );
};
