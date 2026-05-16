//! Integration tests for the multi-dimensional SDE solvers.

use proculate_core::multi_d::{
    solve, solve_with_noise, Equation, EulerMaruyama, Milstein, MultiSolverParams, Sra1, Sra2,
    Sri1, Sri2, Sriw1,
};
use proculate_core::noise::{MultiBrownian, Noise};
use rand::SeedableRng;
use rand_pcg::Pcg64;

fn params(seed: u64, dim: usize, dt: f64) -> MultiSolverParams {
    MultiSolverParams {
        s0: vec![1.0; dim],
        t0: 0.0,
        t_end: 1.0,
        dt,
        seed,
    }
}

fn zero_drift_zero_diff(n: usize) -> Vec<Equation<'static>> {
    (0..n)
        .map(|i| Equation::new(|_: &[f64], _: f64| 0.0, |_: &[f64], _: f64| 0.0, i))
        .collect()
}

#[test]
fn output_shape_matches_step_count() {
    let p = params(42, 2, 0.01);
    let result = solve(&mut EulerMaruyama, &zero_drift_zero_diff(2), p);
    assert_eq!(result.times.len(), 101);
    assert_eq!(result.values.len(), 101);
    for row in &result.values {
        assert_eq!(row.len(), 2);
    }
    assert!((result.times[100] - 1.0).abs() < 1e-9);
}

#[test]
fn degenerate_interval_returns_initial_state() {
    let p = MultiSolverParams {
        t_end: 0.0,
        ..params(0, 3, 0.01)
    };
    let result = solve(&mut EulerMaruyama, &zero_drift_zero_diff(3), p);
    assert_eq!(result.values, vec![vec![1.0, 1.0, 1.0]]);
}

#[test]
fn seed_determinism_across_all_schemes() {
    // Linear coupled drift, scalar GBM-like diffusion.
    fn build() -> Vec<Equation<'static>> {
        vec![
            Equation::new(
                |s: &[f64], _| 0.05 * s[0] - 0.02 * s[1],
                |s: &[f64], _| 0.2 * s[0],
                0,
            ),
            Equation::new(
                |s: &[f64], _| 0.01 * s[0] + 0.03 * s[1],
                |s: &[f64], _| 0.15 * s[1],
                1,
            ),
        ]
    }
    let p = params(7, 2, 0.01);

    let a = solve(&mut EulerMaruyama, &build(), p.clone());
    let b = solve(&mut EulerMaruyama, &build(), p.clone());
    assert_eq!(a.values, b.values);

    let a = solve(&mut Milstein, &build(), p.clone());
    let b = solve(&mut Milstein, &build(), p.clone());
    assert_eq!(a.values, b.values);

    // SRI/SRA carry their own aux RNG, so fresh-construct with the same
    // aux seed for deterministic comparison.
    let a = solve(&mut Sriw1::new(99), &build(), p.clone());
    let b = solve(&mut Sriw1::new(99), &build(), p.clone());
    assert_eq!(a.values, b.values);

    let a = solve(&mut Sra1::new(99), &build(), p.clone());
    let b = solve(&mut Sra1::new(99), &build(), p.clone());
    assert_eq!(a.values, b.values);
}

#[test]
fn zero_noise_recovers_deterministic_system() {
    // Linear coupled ODE: dS1 = -S2 dt, dS2 = S1 dt; rotation by angle T.
    // S(0) = (1, 0) => S(T) = (cos T, sin T).
    fn rotation_eqs() -> Vec<Equation<'static>> {
        vec![
            Equation::new(|s: &[f64], _| -s[1], |_, _| 0.0, 0),
            Equation::new(|s: &[f64], _| s[0], |_, _| 0.0, 1),
        ]
    }
    let p = MultiSolverParams {
        s0: vec![1.0, 0.0],
        t0: 0.0,
        t_end: 1.0,
        dt: 1e-4,
        seed: 1,
    };

    let runs: Vec<(&str, Vec<f64>)> = vec![
        (
            "euler",
            solve(&mut EulerMaruyama, &rotation_eqs(), p.clone())
                .values
                .last()
                .unwrap()
                .clone(),
        ),
        (
            "milstein",
            solve(&mut Milstein, &rotation_eqs(), p.clone())
                .values
                .last()
                .unwrap()
                .clone(),
        ),
        (
            "sra1",
            solve(&mut Sra1::new(0), &rotation_eqs(), p.clone())
                .values
                .last()
                .unwrap()
                .clone(),
        ),
        (
            "sra2",
            solve(&mut Sra2::new(0), &rotation_eqs(), p.clone())
                .values
                .last()
                .unwrap()
                .clone(),
        ),
        (
            "sri1",
            solve(&mut Sri1::new(0), &rotation_eqs(), p.clone())
                .values
                .last()
                .unwrap()
                .clone(),
        ),
        (
            "sri2",
            solve(&mut Sri2::new(0), &rotation_eqs(), p.clone())
                .values
                .last()
                .unwrap()
                .clone(),
        ),
        (
            "sriw1",
            solve(&mut Sriw1::new(0), &rotation_eqs(), p.clone())
                .values
                .last()
                .unwrap()
                .clone(),
        ),
    ];
    for (label, last) in runs {
        let expected = [1f64.cos(), 1f64.sin()];
        assert!(
            (last[0] - expected[0]).abs() < 5e-3 && (last[1] - expected[1]).abs() < 5e-3,
            "{label}: last = {:?}, expected = {:?}",
            last,
            expected
        );
    }
}

/// Replay an explicit sequence of Brownian increments. Used to drive two
/// schemes along the same path.
struct ReplayNoise {
    incs: Vec<Vec<f64>>,
    idx: usize,
}
impl Noise for ReplayNoise {
    type Increment = Vec<f64>;
    fn sample(&mut self, _dt: f64) -> Vec<f64> {
        let v = self.incs[self.idx].clone();
        self.idx += 1;
        v
    }
}

fn record_increments(seed: u64, dim: usize, dt: f64, steps: usize) -> Vec<Vec<f64>> {
    let mut noise = MultiBrownian::new(Pcg64::seed_from_u64(seed), dim);
    (0..steps).map(|_| noise.sample(dt)).collect()
}

#[test]
fn shared_noise_index_yields_perfectly_correlated_paths() {
    // Two GBMs with the same mu, sigma, and shared noise direction should
    // produce identical paths step-for-step.
    let eqs = vec![
        Equation::new(|s: &[f64], _| 0.1 * s[0], |s: &[f64], _| 0.3 * s[0], 0),
        Equation::new(|s: &[f64], _| 0.1 * s[1], |s: &[f64], _| 0.3 * s[1], 0),
    ];
    let p = MultiSolverParams {
        s0: vec![1.0, 1.0],
        t0: 0.0,
        t_end: 1.0,
        dt: 0.005,
        seed: 11,
    };
    let r = solve(&mut EulerMaruyama, &eqs, p);
    for row in &r.values {
        assert!((row[0] - row[1]).abs() < 1e-12, "row = {:?}", row);
    }
}

#[test]
fn independent_noise_indices_diverge() {
    let eqs = vec![
        Equation::new(|s: &[f64], _| 0.1 * s[0], |s: &[f64], _| 0.3 * s[0], 0),
        Equation::new(|s: &[f64], _| 0.1 * s[1], |s: &[f64], _| 0.3 * s[1], 1),
    ];
    let p = MultiSolverParams {
        s0: vec![1.0, 1.0],
        t0: 0.0,
        t_end: 1.0,
        dt: 0.005,
        seed: 3,
    };
    let r = solve(&mut EulerMaruyama, &eqs, p);
    let last = r.values.last().unwrap();
    assert!(
        (last[0] - last[1]).abs() > 1e-3,
        "expected divergence, got {:?}",
        last
    );
}

#[test]
fn euler_mean_matches_decoupled_gbm() {
    let mu = 0.05;
    let sigma = 0.3;
    let t_end = 1.0;
    let s0 = 1.0;
    let n_paths: u64 = 3000;

    let mut sum = [0.0; 2];
    for seed in 0..n_paths {
        let eqs = vec![
            Equation::new(move |s: &[f64], _| mu * s[0], move |s: &[f64], _| sigma * s[0], 0),
            Equation::new(move |s: &[f64], _| mu * s[1], move |s: &[f64], _| sigma * s[1], 1),
        ];
        let p = MultiSolverParams {
            s0: vec![s0, s0],
            t0: 0.0,
            t_end,
            dt: 0.005,
            seed,
        };
        let r = solve(&mut Milstein, &eqs, p);
        let last = r.values.last().unwrap();
        sum[0] += last[0];
        sum[1] += last[1];
    }
    let mean = [sum[0] / n_paths as f64, sum[1] / n_paths as f64];
    let analytic = s0 * (mu * t_end).exp();
    assert!(
        (mean[0] - analytic).abs() < 0.03 && (mean[1] - analytic).abs() < 0.03,
        "means = {:?}, analytic = {}",
        mean,
        analytic
    );
}

#[test]
fn milstein_tracks_coupled_gbm_better_than_euler() {
    // Two GBMs driven by the same Brownian motion. Closed form per
    // component: S_i(T) = S_0 exp((mu - 0.5 sigma_i^2) T + sigma_i W_T).
    let mu = 0.05;
    let sigma = [0.3, 0.5];
    let s0 = 1.0;
    let dt = 0.01;
    let t_end = 1.0;
    let seed = 19;

    let eqs = vec![
        Equation::new(move |s: &[f64], _| mu * s[0], move |s: &[f64], _| sigma[0] * s[0], 0),
        Equation::new(move |s: &[f64], _| mu * s[1], move |s: &[f64], _| sigma[1] * s[1], 0),
    ];
    let p = MultiSolverParams {
        s0: vec![s0, s0],
        t0: 0.0,
        t_end,
        dt,
        seed,
    };

    let steps = p.step_count();
    let incs = record_increments(seed, 1, dt, steps);
    let w_t: f64 = incs.iter().map(|i| i[0]).sum();

    let mut n_e = ReplayNoise {
        incs: incs.clone(),
        idx: 0,
    };
    let mut n_m = ReplayNoise {
        incs: incs.clone(),
        idx: 0,
    };
    let r_e = solve_with_noise(&mut EulerMaruyama, &eqs, p.clone(), &mut n_e);
    let r_m = solve_with_noise(&mut Milstein, &eqs, p.clone(), &mut n_m);

    for (i, &sig) in sigma.iter().enumerate() {
        let analytic = s0 * ((mu - 0.5 * sig * sig) * t_end + sig * w_t).exp();
        let err_e = (r_e.values.last().unwrap()[i] - analytic).abs();
        let err_m = (r_m.values.last().unwrap()[i] - analytic).abs();
        assert!(
            err_m <= err_e + 1e-12,
            "component {i}: milstein err {err_m} > euler err {err_e}"
        );
    }
}

#[test]
fn sra1_solves_additive_noise_ornstein_uhlenbeck() {
    // Coupled OU: dX_i = -theta X_i dt + sigma dW_i. Mean reverts to 0.
    let theta = 1.5;
    let sigma = 0.4;
    let n_paths: u64 = 1500;
    let t_end = 1.0;
    let dt = 0.01;

    let mut sum = [0.0; 2];
    let mut sum_sq = [0.0; 2];
    for seed in 0..n_paths {
        let eqs = vec![
            Equation::new(move |s: &[f64], _| -theta * s[0], move |_: &[f64], _| sigma, 0),
            Equation::new(move |s: &[f64], _| -theta * s[1], move |_: &[f64], _| sigma, 1),
        ];
        let p = MultiSolverParams {
            s0: vec![0.0, 0.0],
            t0: 0.0,
            t_end,
            dt,
            seed,
        };
        // Aux seed varies per path to avoid bias from a fixed aux stream.
        let r = solve(&mut Sra1::new(seed ^ 0xA5A5A5A5), &eqs, p);
        let last = r.values.last().unwrap();
        sum[0] += last[0];
        sum[1] += last[1];
        sum_sq[0] += last[0] * last[0];
        sum_sq[1] += last[1] * last[1];
    }
    let mean = [sum[0] / n_paths as f64, sum[1] / n_paths as f64];
    let var_analytic = sigma * sigma / (2.0 * theta) * (1.0 - (-2.0 * theta * t_end).exp());
    let var_emp = [
        sum_sq[0] / n_paths as f64 - mean[0] * mean[0],
        sum_sq[1] / n_paths as f64 - mean[1] * mean[1],
    ];
    assert!(mean[0].abs() < 0.05 && mean[1].abs() < 0.05, "means {:?}", mean);
    assert!(
        (var_emp[0] - var_analytic).abs() < 0.02 && (var_emp[1] - var_analytic).abs() < 0.02,
        "variances {:?}, analytic {}",
        var_emp,
        var_analytic
    );
}

#[test]
fn all_schemes_step_without_blowup() {
    fn build() -> Vec<Equation<'static>> {
        vec![
            Equation::new(|s: &[f64], _| 0.1 * s[0], |s: &[f64], _| 0.3 * s[0], 0),
            Equation::new(|s: &[f64], _| -0.2 * s[1], |_: &[f64], _| 0.2, 0),
            Equation::new(|s: &[f64], _| s[0] - s[2], |_: &[f64], _| 0.1, 1),
        ]
    }
    let p = MultiSolverParams {
        s0: vec![1.0, 0.5, 0.0],
        t0: 0.0,
        t_end: 0.5,
        dt: 0.01,
        seed: 23,
    };
    let runs: Vec<(&str, _)> = vec![
        ("euler", solve(&mut EulerMaruyama, &build(), p.clone()).values),
        ("milstein", solve(&mut Milstein, &build(), p.clone()).values),
        ("sra1", solve(&mut Sra1::new(0), &build(), p.clone()).values),
        ("sra2", solve(&mut Sra2::new(0), &build(), p.clone()).values),
        ("sri1", solve(&mut Sri1::new(0), &build(), p.clone()).values),
        ("sri2", solve(&mut Sri2::new(0), &build(), p.clone()).values),
        ("sriw1", solve(&mut Sriw1::new(0), &build(), p.clone()).values),
    ];
    for (name, values) in runs {
        assert_eq!(values.len(), 51, "{name} step count");
        for row in &values {
            for &v in row {
                assert!(v.is_finite(), "{name} produced non-finite value {v}");
            }
        }
    }
}

#[test]
fn noise_dim_inferred_from_equation_indices() {
    // Use a noise_index of 4 from one equation; the solver should size the
    // Brownian source accordingly and not panic.
    let eqs = vec![
        Equation::new(|_: &[f64], _| 0.0, |_: &[f64], _| 0.1, 0),
        Equation::new(|_: &[f64], _| 0.0, |_: &[f64], _| 0.1, 4),
    ];
    let p = MultiSolverParams {
        s0: vec![0.0, 0.0],
        t0: 0.0,
        t_end: 0.1,
        dt: 0.01,
        seed: 0,
    };
    let r = solve(&mut EulerMaruyama, &eqs, p);
    assert_eq!(r.values.len(), 11);
    for row in &r.values {
        for &v in row {
            assert!(v.is_finite());
        }
    }
}
