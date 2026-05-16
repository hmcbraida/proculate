import type { TimeSeries } from "@/domain/timeseries";

export type OneDSdeProblem = {
  readonly mu: string;
  readonly sigma: string;
  readonly s0: number;
  readonly t0: number;
  readonly tEnd: number;
  readonly dt: number;
};

export type OneDSolveRequest = OneDSdeProblem & {
  readonly paths: number;
};

export type OneDSolveOutcome =
  | {
      readonly ok: true;
      readonly paths: ReadonlyArray<TimeSeries>;
      readonly notes: ReadonlyArray<string>;
    }
  | { readonly ok: false; readonly error: string };

export interface Solver {
  solveOneD(request: OneDSolveRequest): Promise<OneDSolveOutcome>;
}
