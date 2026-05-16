//! Driver: weave a scheme, a noise source, and `(mu, sigma)` into a trajectory.

use rand::SeedableRng;
use rand_pcg::Pcg64;

use super::params::{SolverParams, SolverResult};
use super::scheme::{Milstein, Scheme};
use crate::noise::{Brownian, Noise};

/// Solve a 1D SDE driven by Brownian motion using the supplied `scheme`.
pub fn solve<Sc, M, S>(scheme: &Sc, mu: M, sigma: S, params: SolverParams) -> SolverResult
where
    Sc: Scheme,
    M: Fn(f64, f64) -> f64,
    S: Fn(f64, f64) -> f64,
{
    let rng = Pcg64::seed_from_u64(params.seed);
    let mut noise = Brownian::new(rng);
    solve_with_noise(scheme, &mu, &sigma, params, &mut noise)
}

/// Solve using an explicit noise source. Lets callers reuse fixed paths
/// for tests, or swap in a non-Brownian process at the call site.
pub fn solve_with_noise<Sc, M, S, N>(
    scheme: &Sc,
    mu: &M,
    sigma: &S,
    params: SolverParams,
    noise: &mut N,
) -> SolverResult
where
    Sc: Scheme,
    M: Fn(f64, f64) -> f64,
    S: Fn(f64, f64) -> f64,
    N: Noise<Increment = f64>,
{
    let steps = params.step_count();
    let dt = params.dt;

    let mut times = Vec::with_capacity(steps + 1);
    let mut values = Vec::with_capacity(steps + 1);

    let mut s = params.s0;
    let mut t = params.t0;
    times.push(t);
    values.push(s);

    for _ in 0..steps {
        let dw = noise.sample(dt);
        s = scheme.step(mu, sigma, s, t, dt, dw);
        t += dt;
        times.push(t);
        values.push(s);
    }

    SolverResult { times, values }
}

/// Convenience for the headline interface: solve with Milstein.
pub fn solve_milstein<M, S>(mu: M, sigma: S, params: SolverParams) -> SolverResult
where
    M: Fn(f64, f64) -> f64,
    S: Fn(f64, f64) -> f64,
{
    solve(&Milstein, mu, sigma, params)
}
