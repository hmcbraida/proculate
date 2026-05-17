import { useState } from "react";

import type { MultiTimeSeries } from "@/domain/timeseries";
import type { EquationState } from "@/features/MultiDEquationInput";
import { MultiDOutput } from "@/features/MultiDOutput";
import {
  type MultiDInputState,
  MultiDSdeInput,
} from "@/features/MultiDSdeInput";
import { StderrBox } from "@/features/StderrBox";
import { wasmSolver } from "@/implementation/wasmSolver";

const EQUATION_COUNT = 8;

// Default system: the Heston stochastic-volatility model, where s0 is the asset
// price and s1 its instantaneous variance.
//   ds0 = 0.05·s0 dt + √s1·s0 dW0
//   ds1 = 2·(0.04 − s1) dt + 0.3·√s1 dW1
const HESTON: ReadonlyArray<Pick<EquationState, "mu" | "sigma" | "s0">> = [
  { mu: "0.05 * s0", sigma: "sqrt(s1) * s0", s0: 100 },
  { mu: "2 * (0.04 - s1)", sigma: "0.3 * sqrt(s1)", s0: 0.04 },
];

const makeEquations = (): ReadonlyArray<EquationState> =>
  Array.from({ length: EQUATION_COUNT }, (_, i) => {
    const heston = HESTON[i];
    return {
      enabled: heston !== undefined,
      mu: heston?.mu ?? `0.05 * s${i}`,
      sigma: heston?.sigma ?? `0.3 * s${i}`,
      s0: heston?.s0 ?? 1,
      noiseIndex: i,
    };
  });

const initialInput: MultiDInputState = {
  equations: makeEquations(),
  scheme: "sri2",
  t0: 0,
  tEnd: 1,
  dt: 0.01,
  paths: 64,
};

type RunState = {
  readonly paths: ReadonlyArray<MultiTimeSeries>;
  readonly enabledSlots: ReadonlyArray<number>;
  readonly notes: ReadonlyArray<string>;
  readonly error: string | null;
  readonly busy: boolean;
};

const emptyRun: RunState = {
  paths: [],
  enabledSlots: [],
  notes: [],
  error: null,
  busy: false,
};

export const MultiDSdeSolvePage = () => {
  const [input, setInput] = useState<MultiDInputState>(initialInput);
  const [run, setRun] = useState<RunState>(emptyRun);

  const handleSubmit = async () => {
    const enabled = input.equations
      .map((eq, slot) => ({ eq, slot }))
      .filter(({ eq }) => eq.enabled);

    if (enabled.length === 0) {
      setRun({ ...emptyRun, error: "enable at least one equation" });
      return;
    }

    setRun((r) => ({ ...r, busy: true, error: null }));

    // Remap the chosen noise sources onto a contiguous range so that equations
    // sharing a source stay coupled while unused sources are not allocated.
    const noiseRemap = new Map<number, number>();
    for (const { eq } of enabled) {
      if (!noiseRemap.has(eq.noiseIndex)) {
        noiseRemap.set(eq.noiseIndex, noiseRemap.size);
      }
    }

    const outcome = await wasmSolver.solveMultiD({
      scheme: input.scheme,
      muExprs: enabled.map(({ eq }) => eq.mu),
      sigmaExprs: enabled.map(({ eq }) => eq.sigma),
      noiseIndices: enabled.map(({ eq }) => noiseRemap.get(eq.noiseIndex) ?? 0),
      s0: enabled.map(({ eq }) => eq.s0),
      t0: input.t0,
      tEnd: input.tEnd,
      dt: input.dt,
      paths: input.paths,
    });

    if (outcome.ok) {
      setRun({
        paths: outcome.paths,
        enabledSlots: enabled.map(({ slot }) => slot),
        notes: outcome.notes,
        error: null,
        busy: false,
      });
    } else {
      setRun({ ...emptyRun, error: outcome.error });
    }
  };

  return (
    <div className="flex flex-col gap-0 border-2 border-ink shadow-brut">
      <MultiDSdeInput
        value={input}
        onChange={setInput}
        onSubmit={handleSubmit}
        busy={run.busy}
      />
      <div className="border-t-2 border-ink">
        <StderrBox error={run.error} notes={run.notes} />
      </div>
      <MultiDOutput paths={run.paths} enabledSlots={run.enabledSlots} />
    </div>
  );
};
