import { useMemo, useState } from "react";

import { computeStatistics, terminalValues } from "@/domain/statistics";
import type { MultiTimeSeries, TimeSeries } from "@/domain/timeseries";
import { Distribution } from "@/features/Distribution";
import {
  MultiStatisticsTable,
  type StatColumn,
} from "@/features/MultiStatisticsTable";
import { SamplePaths } from "@/features/SamplePaths";
import { StatisticsTable } from "@/features/StatisticsTable";
import { DistributionChart } from "@/ui/DistributionChart";
import { LineChart } from "@/ui/LineChart";
import { componentColors } from "@/ui/palette";
import { Radio } from "@/ui/Radio";
import { subscript } from "@/ui/subscript";
import { Tabs } from "@/ui/Tabs";

type Props = {
  paths: ReadonlyArray<MultiTimeSeries>;
  enabledSlots: ReadonlyArray<number>;
};

type Mode = "combined" | "collated";

const MODE_OPTIONS = [
  { value: "combined" as const, label: "combined" },
  { value: "collated" as const, label: "collated" },
];

const componentSeries = (
  paths: ReadonlyArray<MultiTimeSeries>,
  index: number,
): ReadonlyArray<TimeSeries> =>
  paths.map((p) => ({ times: p.times, values: p.components[index] ?? [] }));

const chartHeader = (label: string) => (
  <div className="border-b-2 border-ink bg-ink px-3 py-1 text-xs font-bold uppercase tracking-widest text-paper">
    {label}
  </div>
);

const CollatedComponent = ({
  series,
}: {
  series: ReadonlyArray<TimeSeries>;
}) => {
  const terminals = useMemo(() => terminalValues(series), [series]);
  const stats = useMemo(() => computeStatistics(terminals), [terminals]);
  return (
    <div className="border-2 border-ink">
      <div className="grid grid-cols-1 md:grid-cols-2 md:divide-x-2 md:divide-ink">
        <SamplePaths paths={series} />
        <div className="border-t-2 border-ink md:border-t-0">
          <Distribution samples={terminals} stats={stats} />
        </div>
      </div>
      <div className="border-t-2 border-ink">
        <StatisticsTable stats={stats} />
      </div>
    </div>
  );
};

export const MultiDOutput = ({ paths, enabledSlots }: Props) => {
  const [mode, setMode] = useState<Mode>("combined");
  const [collatedActive, setCollatedActive] = useState(0);

  const colors = useMemo(
    () => componentColors(enabledSlots.length),
    [enabledSlots.length],
  );

  const perComponent = useMemo(
    () => enabledSlots.map((_, j) => componentSeries(paths, j)),
    [paths, enabledSlots],
  );

  const legend = useMemo(
    () =>
      enabledSlots.map((slot, j) => ({
        color: colors[j] ?? "currentColor",
        label: `S${subscript(slot)}`,
      })),
    [enabledSlots, colors],
  );

  const lineGroups = useMemo(
    () =>
      perComponent.map((series, j) => ({
        color: colors[j] ?? "currentColor",
        series,
      })),
    [perComponent, colors],
  );

  const terminalsPerComponent = useMemo(
    () => perComponent.map((series) => terminalValues(series)),
    [perComponent],
  );

  const distGroups = useMemo(
    () =>
      terminalsPerComponent.map((samples, j) => ({
        color: colors[j] ?? "currentColor",
        samples,
      })),
    [terminalsPerComponent, colors],
  );

  const statColumns = useMemo<ReadonlyArray<StatColumn>>(
    () =>
      terminalsPerComponent.map((samples, j) => ({
        label: `S${subscript(enabledSlots[j] ?? j)}`,
        stats: computeStatistics(samples),
      })),
    [terminalsPerComponent, enabledSlots],
  );

  const safeActive =
    enabledSlots.length === 0
      ? 0
      : Math.min(collatedActive, enabledSlots.length - 1);

  return (
    <>
      <div className="flex items-center gap-6 border-t-2 border-ink p-3">
        <span className="text-xs font-bold uppercase tracking-widest text-ink">
          output
        </span>
        <Radio
          name="output-mode"
          value={mode}
          options={MODE_OPTIONS}
          onChange={(m) => setMode(m as Mode)}
        />
      </div>
      {mode === "combined" ? (
        <>
          <div className="grid grid-cols-1 border-t-2 border-ink md:grid-cols-2 md:divide-x-2 md:divide-ink">
            <div className="flex flex-col">
              {chartHeader("sample paths")}
              <div className="relative h-72 w-full text-ink">
                <LineChart
                  groups={lineGroups}
                  legend={legend}
                  showTicks={false}
                  width={800}
                  height={300}
                />
              </div>
            </div>
            <div className="flex flex-col border-t-2 border-ink md:border-t-0">
              {chartHeader("terminal distribution")}
              <div className="relative h-72 w-full text-ink">
                <DistributionChart
                  groups={distGroups}
                  legend={legend}
                  width={800}
                  height={300}
                />
              </div>
            </div>
          </div>
          <div className="border-t-2 border-ink">
            <MultiStatisticsTable columns={statColumns} />
          </div>
        </>
      ) : (
        <div className="border-t-2 border-ink p-3">
          {enabledSlots.length > 0 ? (
            <Tabs
              variant="plain"
              active={safeActive}
              onSelect={setCollatedActive}
              labels={enabledSlots.map((slot) => `S${subscript(slot)}`)}
            >
              {perComponent.map((series, j) => (
                <CollatedComponent key={j} series={series} />
              ))}
            </Tabs>
          ) : null}
        </div>
      )}
    </>
  );
};
