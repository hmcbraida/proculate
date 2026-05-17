import init, {
  solve_sde_milstein,
  solve_sde_multi_euler_maruyama,
  solve_sde_multi_milstein,
  solve_sde_multi_sra1,
  solve_sde_multi_sra2,
  solve_sde_multi_sri1,
  solve_sde_multi_sri2,
  solve_sde_multi_sriw1,
} from "proculate-wasm";
// Bun bundles the file and yields a URL string at runtime.
import wasmUrl from "proculate-wasm/proculate_wasm_bg.wasm" with {
  type: "file",
};

import type { MultiTimeSeries, TimeSeries } from "@/domain/timeseries";
import type {
  MultiDScheme,
  MultiDSolveOutcome,
  MultiDSolveRequest,
  OneDSolveOutcome,
  OneDSolveRequest,
  Solver,
} from "@/protocol/solver";

let readyPromise: Promise<void> | null = null;

const ensureReady = (): Promise<void> => {
  if (!readyPromise) {
    readyPromise = init({ module_or_path: wasmUrl }).then(() => undefined);
  }
  return readyPromise;
};

const validateOneD = (req: OneDSolveRequest): string | null => {
  if (!Number.isFinite(req.s0)) return "s0 must be a finite number";
  if (!Number.isFinite(req.t0)) return "t0 must be a finite number";
  if (!Number.isFinite(req.tEnd)) return "tEnd must be a finite number";
  if (!Number.isFinite(req.dt) || req.dt <= 0)
    return "dt must be a positive number";
  if (req.tEnd <= req.t0) return "tEnd must be greater than t0";
  if (req.paths < 1) return "paths must be at least 1";
  return null;
};

const validateMultiD = (req: MultiDSolveRequest): string | null => {
  if (req.muExprs.length === 0) return "must have at least one equation";
  if (req.sigmaExprs.length !== req.muExprs.length)
    return "sigmaExprs must have the same length as muExprs";
  if (req.noiseIndices.length !== req.muExprs.length)
    return "noiseIndices must have the same length as muExprs";
  if (req.s0.length !== req.muExprs.length)
    return "s0 must have the same length as muExprs";
  if (!Number.isFinite(req.t0)) return "t0 must be a finite number";
  if (!Number.isFinite(req.tEnd)) return "tEnd must be a finite number";
  if (!Number.isFinite(req.dt) || req.dt <= 0)
    return "dt must be a positive number";
  if (req.tEnd <= req.t0) return "tEnd must be greater than t0";
  if (req.paths < 1) return "paths must be at least 1";
  return null;
};

type MultiDWasmFn = (
  mu_exprs: string[],
  sigma_exprs: string[],
  noise_indices: Uint32Array,
  s0: Float64Array,
  t0: number,
  t_end: number,
  dt: number,
) => ReturnType<typeof solve_sde_multi_euler_maruyama>;

const SCHEME_FN: Record<MultiDScheme, MultiDWasmFn> = {
  "euler-maruyama": solve_sde_multi_euler_maruyama,
  milstein: solve_sde_multi_milstein,
  sra1: solve_sde_multi_sra1,
  sra2: solve_sde_multi_sra2,
  sri1: solve_sde_multi_sri1,
  sri2: solve_sde_multi_sri2,
  sriw1: solve_sde_multi_sriw1,
};

class WasmSolver implements Solver {
  async solveOneD(req: OneDSolveRequest): Promise<OneDSolveOutcome> {
    const invalid = validateOneD(req);
    if (invalid) return { ok: false, error: invalid };

    try {
      await ensureReady();
    } catch (e) {
      return {
        ok: false,
        error: `failed to load solver: ${(e as Error).message}`,
      };
    }

    const out: TimeSeries[] = [];
    const notes: string[] = [];

    for (let i = 0; i < req.paths; i += 1) {
      try {
        const r = solve_sde_milstein(
          req.mu,
          req.sigma,
          req.s0,
          req.t0,
          req.tEnd,
          req.dt,
        );
        out.push({ times: Array.from(r.times), values: Array.from(r.values) });
        r.free();
      } catch (e) {
        return { ok: false, error: (e as Error).message };
      }
    }

    return { ok: true, paths: out, notes };
  }

  async solveMultiD(req: MultiDSolveRequest): Promise<MultiDSolveOutcome> {
    const invalid = validateMultiD(req);
    if (invalid) return { ok: false, error: invalid };

    try {
      await ensureReady();
    } catch (e) {
      return {
        ok: false,
        error: `failed to load solver: ${(e as Error).message}`,
      };
    }

    const fn = SCHEME_FN[req.scheme];
    const muExprs = Array.from(req.muExprs);
    const sigmaExprs = Array.from(req.sigmaExprs);
    const noiseIndices = new Uint32Array(req.noiseIndices);
    const s0 = new Float64Array(req.s0);

    const out: MultiTimeSeries[] = [];
    const notes: string[] = [];

    for (let i = 0; i < req.paths; i += 1) {
      try {
        const r = fn(
          muExprs,
          sigmaExprs,
          noiseIndices,
          s0,
          req.t0,
          req.tEnd,
          req.dt,
        );
        const times = Array.from(r.times);
        const components: number[][] = [];
        for (let j = 0; j < r.dim; j += 1) {
          components.push(Array.from(r.component(j)));
        }
        out.push({ times, components });
        r.free();
      } catch (e) {
        return { ok: false, error: (e as Error).message };
      }
    }

    return { ok: true, paths: out, notes };
  }
}

export const wasmSolver: Solver = new WasmSolver();
