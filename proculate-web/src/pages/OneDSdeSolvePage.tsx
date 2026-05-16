import { useMemo, useState } from "react";

import { computeStatistics, terminalValues } from "@/domain/statistics";
import type { TimeSeries } from "@/domain/timeseries";
import { Distribution } from "@/features/Distribution";
import { type OneDInputState, OneDSdeInput } from "@/features/OneDSdeInput";
import { SamplePaths } from "@/features/SamplePaths";
import { StatisticsTable } from "@/features/StatisticsTable";
import { StderrBox } from "@/features/StderrBox";
import { wasmSolver } from "@/implementation/wasmSolver";

const initialInput: OneDInputState = {
  mu: "0.05 * S",
  sigma: "0.3 * S",
  s0: 1,
  t0: 0,
  tEnd: 1,
  dt: 0.01,
  paths: 64,
};

type RunState = {
  readonly paths: ReadonlyArray<TimeSeries>;
  readonly notes: ReadonlyArray<string>;
  readonly error: string | null;
  readonly busy: boolean;
};

const emptyRun: RunState = { paths: [], notes: [], error: null, busy: false };

export const OneDSdeSolvePage = () => {
  const [input, setInput] = useState<OneDInputState>(initialInput);
  const [run, setRun] = useState<RunState>(emptyRun);

  const handleSubmit = async () => {
    setRun((r) => ({ ...r, busy: true, error: null }));
    const outcome = await wasmSolver.solveOneD({
      mu: input.mu,
      sigma: input.sigma,
      s0: input.s0,
      t0: input.t0,
      tEnd: input.tEnd,
      dt: input.dt,
      paths: input.paths,
    });
    if (outcome.ok) {
      setRun({
        paths: outcome.paths,
        notes: outcome.notes,
        error: null,
        busy: false,
      });
    } else {
      setRun({ paths: [], notes: [], error: outcome.error, busy: false });
    }
  };

  const terminals = useMemo(() => terminalValues(run.paths), [run.paths]);
  const stats = useMemo(() => computeStatistics(terminals), [terminals]);

  return (
    <div className="flex flex-col gap-0 border-2 border-ink shadow-brut">
      <OneDSdeInput
        value={input}
        onChange={setInput}
        onSubmit={handleSubmit}
        busy={run.busy}
      />
      <div className="border-t-2 border-ink">
        <StderrBox error={run.error} notes={run.notes} />
      </div>
      <div className="grid grid-cols-1 border-t-2 border-ink md:grid-cols-2 md:divide-x-2 md:divide-ink">
        <div className="flex flex-col">
          <div className="border-b-2 border-ink bg-ink px-3 py-1 text-xs font-bold uppercase tracking-widest text-paper">
            sample paths
          </div>
          <SamplePaths paths={run.paths} />
        </div>
        <div className="flex flex-col border-t-2 border-ink md:border-t-0">
          <div className="border-b-2 border-ink bg-ink px-3 py-1 text-xs font-bold uppercase tracking-widest text-paper">
            terminal distribution
          </div>
          <Distribution samples={terminals} stats={stats} />
        </div>
      </div>
      <div className="border-t-2 border-ink">
        <StatisticsTable stats={stats} />
      </div>
    </div>
  );
};
