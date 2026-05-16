//! Integration tests for the 1D SDE solvers.

use proculate_core::one_d::{
    solve, solve_milstein, EulerMaruyama, Milstein, SolverParams,
};

fn params(seed: u64) -> SolverParams {
    SolverParams {
        s0: 1.0,
        t0: 0.0,
        t_end: 1.0,
        dt: 0.01,
        seed,
    }
}

#[test]
fn output_length_matches_step_count() {
    let result = solve_milstein(|_, _| 0.0, |_, _| 0.0, params(42));
    assert_eq!(result.times.len(), result.values.len());
    assert_eq!(result.times.len(), 101);
    assert!((result.times[100] - 1.0).abs() < 1e-9);
}

#[test]
fn step_count_handles_degenerate_interval() {
    let p = SolverParams { t_end: 0.0, ..params(0) };
    assert_eq!(p.step_count(), 0);
    let result = solve_milstein(|_, _| 1.0, |_, _| 1.0, p);
    assert_eq!(result.values, vec![1.0]);
}

#[test]
fn zero_noise_recovers_deterministic_ode() {
    // dS = mu*S dt -> S(T) = S0 * exp(mu*T).
    let mu_k = 0.1;
    let t_end = 1.0;
    let fine = SolverParams { dt: 1e-4, t_end, ..params(1) };
    let result = solve_milstein(move |s, _| mu_k * s, |_, _| 0.0, fine);
    let analytic = (mu_k * t_end).exp();
    let last = *result.values.last().unwrap();
    assert!(
        (last - analytic).abs() < 1e-3,
        "last = {last}, analytic = {analytic}"
    );
}

#[test]
fn seed_is_deterministic() {
    let a = solve_milstein(|s, _| 0.1 * s, |s, _| 0.2 * s, params(7));
    let b = solve_milstein(|s, _| 0.1 * s, |s, _| 0.2 * s, params(7));
    assert_eq!(a.values, b.values);
}

#[test]
fn different_seeds_produce_different_paths() {
    let a = solve_milstein(|s, _| 0.1 * s, |s, _| 0.2 * s, params(1));
    let b = solve_milstein(|s, _| 0.1 * s, |s, _| 0.2 * s, params(2));
    assert_ne!(a.values, b.values);
}

#[test]
fn euler_maruyama_also_solves_zero_noise() {
    let mu_k = 0.1;
    let t_end = 1.0;
    let fine = SolverParams { dt: 1e-4, t_end, ..params(3) };
    let result = solve(&EulerMaruyama, move |s, _| mu_k * s, |_, _| 0.0, fine);
    let analytic = (mu_k * t_end).exp();
    let last = *result.values.last().unwrap();
    assert!((last - analytic).abs() < 1e-3);
}

#[test]
fn gbm_mean_matches_analytic() {
    // Geometric Brownian motion: dS = mu*S dt + sigma*S dB.
    // E[S_T] = S_0 * exp(mu * T). Average many seeds and check.
    let mu = 0.05;
    let sigma = 0.3;
    let t_end = 1.0;
    let s0 = 1.0;
    let n_paths: u64 = 4000;

    let mut sum = 0.0;
    for seed in 0..n_paths {
        let p = SolverParams { s0, t0: 0.0, t_end, dt: 0.005, seed };
        let r = solve_milstein(move |s, _| mu * s, move |s, _| sigma * s, p);
        sum += *r.values.last().unwrap();
    }
    let mean = sum / n_paths as f64;
    let analytic = s0 * (mu * t_end).exp();
    // Standard error for lognormal mean with sigma=0.3, T=1 is roughly
    // 0.3/sqrt(N) ~ 0.005; 0.02 gives comfortable headroom.
    assert!(
        (mean - analytic).abs() < 0.02,
        "mean = {mean}, analytic = {analytic}"
    );
}

#[test]
fn milstein_matches_gbm_more_accurately_than_euler() {
    // Strong-order comparison: under refined dt, Milstein should track the
    // analytic GBM closer than Euler for the same path.
    use proculate_core::noise::{Brownian, Noise};
    use proculate_core::one_d::{solve_with_noise};
    use rand::SeedableRng;
    use rand_pcg::Pcg64;

    let mu = 0.05;
    let sigma = 0.5;
    let t_end = 1.0;
    let s0 = 1.0;

    let drift = |s: f64, _t: f64| mu * s;
    let diff = |s: f64, _t: f64| sigma * s;
    let p = SolverParams { s0, t0: 0.0, t_end, dt: 0.01, seed: 11 };

    // Sample one shared path of increments; reuse for both schemes.
    let mut brownian = Brownian::new(Pcg64::seed_from_u64(p.seed));
    let increments: Vec<f64> = (0..p.step_count()).map(|_| brownian.sample(p.dt)).collect();

    struct Replay { incs: Vec<f64>, idx: usize }
    impl Noise for Replay {
        type Increment = f64;
        fn sample(&mut self, _dt: f64) -> f64 {
            let v = self.incs[self.idx];
            self.idx += 1;
            v
        }
    }

    let mut n1 = Replay { incs: increments.clone(), idx: 0 };
    let mut n2 = Replay { incs: increments.clone(), idx: 0 };

    let r_milstein = solve_with_noise(&Milstein, &drift, &diff, p, &mut n1);
    let r_euler = solve_with_noise(&EulerMaruyama, &drift, &diff, p, &mut n2);

    // Closed-form GBM driven by the same Brownian path:
    // S_T = S_0 * exp((mu - 0.5 sigma^2) T + sigma * W_T)
    let w_t: f64 = increments.iter().sum();
    let analytic = s0 * ((mu - 0.5 * sigma * sigma) * t_end + sigma * w_t).exp();

    let err_m = (*r_milstein.values.last().unwrap() - analytic).abs();
    let err_e = (*r_euler.values.last().unwrap() - analytic).abs();
    assert!(
        err_m <= err_e,
        "milstein err {err_m} should be <= euler err {err_e}"
    );
}
