import type { TimeSeries } from "@/domain/timeseries";
import { LineChart } from "@/ui/LineChart";

type Props = {
  paths: ReadonlyArray<TimeSeries>;
};

export const SamplePaths = ({ paths }: Props) => (
  <div className="relative w-full h-72 text-ink">
    <LineChart series={paths} width={800} height={300} />
  </div>
);
