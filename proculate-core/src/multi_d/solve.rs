//! Driver: weave a scheme, a vector noise source, and a list of coupled
//! equations into a system trajectory.

use rand::SeedableRng;
use rand_pcg::Pcg64;

use crate::noise::{MultiBrownian, Noise};

use super::params::{Equation, MultiSolverParams, MultiSolverResult};
use super::scheme::MultiScheme;

/// Solve a coupled SDE system driven by independent Brownian motions. The
/// number of independent Wiener processes is inferred from the equations as
/// `max(noise_index) + 1`.
pub fn solve<Sc: MultiScheme>(
    scheme: &mut Sc,
    equations: &[Equation<'_>],
    params: MultiSolverParams,
) -> MultiSolverResult {
    let noise_dim = equations
        .iter()
        .map(|eq| eq.noise_index)
        .max()
        .map_or(0, |m| m + 1);
    let rng = Pcg64::seed_from_u64(params.seed);
    let mut noise = MultiBrownian::new(rng, noise_dim);
    solve_with_noise(scheme, equations, params, &mut noise)
}

/// Solve using an explicit vector noise source. Lets tests inject fixed
/// paths or share a noise source between schemes. The caller is responsible
/// for sizing the noise so every `noise_index` is in range.
pub fn solve_with_noise<Sc, N>(
    scheme: &mut Sc,
    equations: &[Equation<'_>],
    params: MultiSolverParams,
    noise: &mut N,
) -> MultiSolverResult
where
    Sc: MultiScheme,
    N: Noise<Increment = Vec<f64>>,
{
    assert_eq!(
        equations.len(),
        params.s0.len(),
        "equation count must match initial-state dimension"
    );

    let steps = params.step_count();
    let dt = params.dt;

    let mut times = Vec::with_capacity(steps + 1);
    let mut values = Vec::with_capacity(steps + 1);

    let mut s = params.s0.clone();
    let mut t = params.t0;
    times.push(t);
    values.push(s.clone());

    for _ in 0..steps {
        let dw = noise.sample(dt);
        s = scheme.step(equations, &s, t, dt, &dw);
        t += dt;
        times.push(t);
        values.push(s.clone());
    }

    MultiSolverResult { times, values }
}
