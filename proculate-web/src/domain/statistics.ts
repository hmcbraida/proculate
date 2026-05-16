export type SampleStatistics = {
  readonly count: number;
  readonly mean: number;
  readonly median: number;
  readonly stddev: number;
};

export const computeStatistics = (
  samples: ReadonlyArray<number>,
): SampleStatistics => {
  const n = samples.length;
  if (n === 0) return { count: 0, mean: NaN, median: NaN, stddev: NaN };
  let sum = 0;
  for (const s of samples) sum += s;
  const mean = sum / n;
  let sq = 0;
  for (const s of samples) {
    const d = s - mean;
    sq += d * d;
  }
  const stddev = Math.sqrt(sq / Math.max(1, n - 1));
  const sorted = [...samples].sort((a, b) => a - b);
  const median =
    n % 2 === 0
      ? ((sorted[n / 2 - 1] ?? 0) + (sorted[n / 2] ?? 0)) / 2
      : (sorted[(n - 1) / 2] ?? NaN);
  return { count: n, mean, median, stddev };
};

export const terminalValues = <
  T extends { readonly values: ReadonlyArray<number> },
>(
  paths: ReadonlyArray<T>,
): ReadonlyArray<number> => {
  const out: number[] = [];
  for (const p of paths) {
    const v = p.values[p.values.length - 1];
    if (v !== undefined && Number.isFinite(v)) out.push(v);
  }
  return out;
};
