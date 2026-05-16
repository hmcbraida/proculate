import init, { solve_sde_milstein } from "proculate-wasm";
// Bun bundles the file and yields a URL string at runtime.
import wasmUrl from "proculate-wasm/proculate_wasm_bg.wasm" with { type: "file" };

import type { TimeSeries } from "@/domain/timeseries";
import type { OneDSolveOutcome, OneDSolveRequest, Solver } from "@/protocol/solver";

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
  if (!Number.isFinite(req.dt) || req.dt <= 0) return "dt must be a positive number";
  if (req.tEnd <= req.t0) return "tEnd must be greater than t0";
  if (req.paths < 1) return "paths must be at least 1";
  return null;
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
        const r = solve_sde_milstein(req.mu, req.sigma, req.s0, req.t0, req.tEnd, req.dt);
        out.push({ times: Array.from(r.times), values: Array.from(r.values) });
        r.free();
      } catch (e) {
        return { ok: false, error: (e as Error).message };
      }
    }

    const totalSteps = req.paths * Math.ceil((req.tEnd - req.t0) / req.dt);
    if (totalSteps > 5_000_000) {
      notes.push("large workload: consider fewer paths or a coarser dt");
    }

    return { ok: true, paths: out, notes };
  }
}

export const wasmSolver: Solver = new WasmSolver();
