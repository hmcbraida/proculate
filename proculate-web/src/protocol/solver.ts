import type { MultiTimeSeries, TimeSeries } from "@/domain/timeseries";

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

export type MultiDScheme =
  | "euler-maruyama"
  | "milstein"
  | "sra1"
  | "sra2"
  | "sri1"
  | "sri2"
  | "sriw1";

export type MultiDSolveRequest = {
  readonly scheme: MultiDScheme;
  readonly muExprs: ReadonlyArray<string>;
  readonly sigmaExprs: ReadonlyArray<string>;
  readonly noiseIndices: ReadonlyArray<number>;
  readonly s0: ReadonlyArray<number>;
  readonly t0: number;
  readonly tEnd: number;
  readonly dt: number;
  readonly paths: number;
};

export type MultiDSolveOutcome =
  | {
      readonly ok: true;
      readonly paths: ReadonlyArray<MultiTimeSeries>;
      readonly notes: ReadonlyArray<string>;
    }
  | { readonly ok: false; readonly error: string };

export interface Solver {
  solveOneD(request: OneDSolveRequest): Promise<OneDSolveOutcome>;
  solveMultiD(request: MultiDSolveRequest): Promise<MultiDSolveOutcome>;
}
