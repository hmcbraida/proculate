//! Time-stepping schemes for multi-dimensional SDE systems.
//!
//! The high-order schemes (SRI, SRA) implement the stochastic Runge-Kutta
//! framework of A. Rößler, "Runge-Kutta Methods for the Strong Approximation
//! of Solutions of Stochastic Differential Equations" (SIAM J. Numer. Anal.,
//! 2010). Each component is driven by a single Wiener process (with possible
//! sharing across components) so the scheme reduces, per component, to the
//! scalar SRI/SRA formulation evaluated against the joint state vector.
//!
//! The Brownian increments `dW` are passed in by the driver; any *additional*
//! Gaussian variates a scheme needs to approximate iterated stochastic
//! integrals (`I_{(1,0)}` for SRI/SRA) are sampled by the scheme itself from
//! an internal RNG. That keeps the noise abstraction clean -- the noise
//! source produces only the physical driving process, and scheme-specific
//! scratch randomness stays inside the scheme.

use rand::SeedableRng;
use rand_distr::{Distribution, Normal};
use rand_pcg::Pcg64;

use crate::numeric::partial_diff;

use super::params::Equation;

/// One integration step of a multi-dimensional SDE system. `dw[k]` is the
/// increment of the k-th Wiener process.
pub trait MultiScheme {
    fn step(
        &mut self,
        equations: &[Equation<'_>],
        s: &[f64],
        t: f64,
        dt: f64,
        dw: &[f64],
    ) -> Vec<f64>;
}

// ---------------------------------------------------------------------------
// Euler-Maruyama
// ---------------------------------------------------------------------------

/// `S_{n+1, i} = S_n,i + mu_i(S, t) dt + sigma_i(S, t) dW_{k_i}`.
pub struct EulerMaruyama;

impl MultiScheme for EulerMaruyama {
    fn step(
        &mut self,
        equations: &[Equation<'_>],
        s: &[f64],
        t: f64,
        dt: f64,
        dw: &[f64],
    ) -> Vec<f64> {
        let mut out = Vec::with_capacity(equations.len());
        for (i, eq) in equations.iter().enumerate() {
            let mu = (eq.mu)(s, t);
            let sigma = (eq.sigma)(s, t);
            out.push(s[i] + mu * dt + sigma * dw[eq.noise_index]);
        }
        out
    }
}

// ---------------------------------------------------------------------------
// Milstein (commutative-noise variant)
// ---------------------------------------------------------------------------

/// Multi-dimensional Milstein scheme (strong order 1.0) assuming commutative
/// noise. The correction for component `i` is
///
/// ```text
///   0.5 * sum_l sigma_l (d sigma_i / d S_l) (dW_{k_l} dW_{k_i} - delta_{k_l, k_i} dt)
/// ```
///
/// Partial derivatives of `sigma_i` are taken by central differences. When
/// no two equations share a noise index this collapses to the diagonal
/// Milstein correction, recovering the 1D formula along the diagonal.
pub struct Milstein;

impl MultiScheme for Milstein {
    fn step(
        &mut self,
        equations: &[Equation<'_>],
        s: &[f64],
        t: f64,
        dt: f64,
        dw: &[f64],
    ) -> Vec<f64> {
        let n = equations.len();
        let sigma_vals: Vec<f64> = equations.iter().map(|eq| (eq.sigma)(s, t)).collect();

        let mut out = Vec::with_capacity(n);
        for i in 0..n {
            let eq_i = &equations[i];
            let mu_i = (eq_i.mu)(s, t);
            let k_i = eq_i.noise_index;
            let sig_i = sigma_vals[i];
            let dw_i = dw[k_i];

            let mut value = s[i] + mu_i * dt + sig_i * dw_i;

            for l in 0..n {
                let k_l = equations[l].noise_index;
                let sig_l = sigma_vals[l];
                let dsig_i_dl = partial_diff(&eq_i.sigma, s, t, l);
                let dw_l = dw[k_l];
                let delta = if k_l == k_i { dt } else { 0.0 };
                value += 0.5 * sig_l * dsig_i_dl * (dw_l * dw_i - delta);
            }
            out.push(value);
        }
        out
    }
}

// ---------------------------------------------------------------------------
// Stochastic Runge-Kutta tableaux
// ---------------------------------------------------------------------------

/// Butcher-style tableau for an SRA (additive-noise) scheme. `a0` and `b0`
/// must be strictly lower triangular so stages can be evaluated sequentially.
#[derive(Debug, Clone)]
pub struct SraTableau {
    pub s: usize,
    pub a0: Vec<Vec<f64>>,
    pub b0: Vec<Vec<f64>>,
    pub c0: Vec<f64>,
    pub c1: Vec<f64>,
    pub alpha: Vec<f64>,
    pub beta1: Vec<f64>,
    pub beta2: Vec<f64>,
}

/// Butcher-style tableau for a general SRI (Itô) scheme.
#[derive(Debug, Clone)]
pub struct SriTableau {
    pub s: usize,
    pub a0: Vec<Vec<f64>>,
    pub a1: Vec<Vec<f64>>,
    pub b0: Vec<Vec<f64>>,
    pub b1: Vec<Vec<f64>>,
    pub c0: Vec<f64>,
    pub c1: Vec<f64>,
    pub alpha: Vec<f64>,
    pub beta1: Vec<f64>,
    pub beta2: Vec<f64>,
    pub beta3: Vec<f64>,
    pub beta4: Vec<f64>,
}

// Approximation of the iterated integral I_{(1,0), k} for each noise
// direction k: `I_{(1,0)} = dt/2 * (dW + dZ / sqrt(3))` with `dZ ~ N(0, dt)`
// independent of `dW`. One draw per noise direction (components that share a
// direction share the value).
fn sample_i10(rng: &mut Pcg64, standard: &Normal<f64>, dw: &[f64], dt: f64) -> Vec<f64> {
    let sd = dt.sqrt();
    let sqrt3_inv = 1.0 / 3f64.sqrt();
    dw.iter()
        .map(|&dwi| 0.5 * dt * (dwi + standard.sample(rng) * sd * sqrt3_inv))
        .collect()
}

// ---------------------------------------------------------------------------
// SRA driver
// ---------------------------------------------------------------------------

#[allow(clippy::needless_range_loop)]
fn sra_step(
    tab: &SraTableau,
    equations: &[Equation<'_>],
    s: &[f64],
    t: f64,
    dt: f64,
    dw: &[f64],
    i10_by_dir: &[f64],
) -> Vec<f64> {
    let n = equations.len();

    let mut h0: Vec<Vec<f64>> = vec![vec![0.0; n]; tab.s];
    let mut a_stage: Vec<Vec<f64>> = vec![vec![0.0; n]; tab.s];

    for l in 0..tab.s {
        for i in 0..n {
            let k_i = equations[i].noise_index;
            let i10 = i10_by_dir[k_i];
            let mut acc = s[i];
            for j in 0..l {
                acc += tab.a0[l][j] * a_stage[j][i] * dt
                    + tab.b0[l][j] * (equations[i].sigma)(s, t + tab.c1[j] * dt) * (i10 / dt);
            }
            h0[l][i] = acc;
        }
        for i in 0..n {
            a_stage[l][i] = (equations[i].mu)(&h0[l], t + tab.c0[l] * dt);
        }
    }

    let mut out = Vec::with_capacity(n);
    for i in 0..n {
        let k_i = equations[i].noise_index;
        let i1 = dw[k_i];
        let i10 = i10_by_dir[k_i];
        let mut value = s[i];
        for l in 0..tab.s {
            value += tab.alpha[l] * a_stage[l][i] * dt;
            let b = (equations[i].sigma)(s, t + tab.c1[l] * dt);
            value += (tab.beta1[l] * i1 + tab.beta2[l] * i10 / dt) * b;
        }
        out.push(value);
    }
    out
}

// ---------------------------------------------------------------------------
// SRI driver
// ---------------------------------------------------------------------------

fn sri_step(
    tab: &SriTableau,
    equations: &[Equation<'_>],
    s: &[f64],
    t: f64,
    dt: f64,
    dw: &[f64],
    i10_by_dir: &[f64],
) -> Vec<f64> {
    let n = equations.len();
    let sqrt_h = dt.sqrt();

    // Per-noise-direction iterated integrals.
    let noise_dim = dw.len();
    let mut i1 = vec![0.0; noise_dim];
    let mut i11 = vec![0.0; noise_dim];
    let mut i111 = vec![0.0; noise_dim];
    for k in 0..noise_dim {
        let dwk = dw[k];
        i1[k] = dwk;
        i11[k] = 0.5 * (dwk * dwk - dt);
        i111[k] = (dwk * dwk * dwk - 3.0 * dt * dwk) / 6.0;
    }

    let mut h0: Vec<Vec<f64>> = vec![vec![0.0; n]; tab.s];
    let mut h1: Vec<Vec<f64>> = vec![vec![0.0; n]; tab.s];
    let mut a_stage: Vec<Vec<f64>> = vec![vec![0.0; n]; tab.s];
    let mut b_stage: Vec<Vec<f64>> = vec![vec![0.0; n]; tab.s];

    for l in 0..tab.s {
        for i in 0..n {
            let k_i = equations[i].noise_index;
            let i10 = i10_by_dir[k_i];
            let mut h0_li = s[i];
            let mut h1_li = s[i];
            for j in 0..l {
                h0_li +=
                    tab.a0[l][j] * a_stage[j][i] * dt + tab.b0[l][j] * b_stage[j][i] * (i10 / dt);
                h1_li += tab.a1[l][j] * a_stage[j][i] * dt + tab.b1[l][j] * b_stage[j][i] * sqrt_h;
            }
            h0[l][i] = h0_li;
            h1[l][i] = h1_li;
        }
        for i in 0..n {
            a_stage[l][i] = (equations[i].mu)(&h0[l], t + tab.c0[l] * dt);
            b_stage[l][i] = (equations[i].sigma)(&h1[l], t + tab.c1[l] * dt);
        }
    }

    let mut out = Vec::with_capacity(n);
    for i in 0..n {
        let k_i = equations[i].noise_index;
        let i10 = i10_by_dir[k_i];
        let mut value = s[i];
        for l in 0..tab.s {
            value += tab.alpha[l] * a_stage[l][i] * dt;
            value += (tab.beta1[l] * i1[k_i]
                + tab.beta2[l] * i11[k_i] / sqrt_h
                + tab.beta3[l] * i10 / dt
                + tab.beta4[l] * i111[k_i] / dt)
                * b_stage[l][i];
        }
        out.push(value);
    }
    out
}

// ---------------------------------------------------------------------------
// Named SRA / SRI schemes
// ---------------------------------------------------------------------------

// All SRI/SRA schemes share a tiny "auxiliary Gaussian source" used only to
// build the I_{(1,0)} approximation. Encapsulated here so each named scheme
// is just (rng + tableau).
struct AuxRng {
    rng: Pcg64,
    standard: Normal<f64>,
}

impl AuxRng {
    fn new(seed: u64) -> Self {
        Self {
            rng: Pcg64::seed_from_u64(seed),
            standard: Normal::new(0.0, 1.0).expect("valid normal parameters"),
        }
    }

    fn i10(&mut self, dw: &[f64], dt: f64) -> Vec<f64> {
        sample_i10(&mut self.rng, &self.standard, dw, dt)
    }
}

macro_rules! define_sra {
    ($name:ident, $doc:expr, $tableau:expr) => {
        #[doc = $doc]
        pub struct $name {
            aux: AuxRng,
        }
        impl $name {
            pub fn new(seed: u64) -> Self {
                Self {
                    aux: AuxRng::new(seed),
                }
            }
        }
        impl Default for $name {
            fn default() -> Self {
                Self::new(0)
            }
        }
        impl MultiScheme for $name {
            fn step(
                &mut self,
                equations: &[Equation<'_>],
                s: &[f64],
                t: f64,
                dt: f64,
                dw: &[f64],
            ) -> Vec<f64> {
                let tab: SraTableau = $tableau;
                let i10 = self.aux.i10(dw, dt);
                sra_step(&tab, equations, s, t, dt, dw, &i10)
            }
        }
    };
}

macro_rules! define_sri {
    ($name:ident, $doc:expr, $tableau:expr) => {
        #[doc = $doc]
        pub struct $name {
            aux: AuxRng,
        }
        impl $name {
            pub fn new(seed: u64) -> Self {
                Self {
                    aux: AuxRng::new(seed),
                }
            }
        }
        impl Default for $name {
            fn default() -> Self {
                Self::new(0)
            }
        }
        impl MultiScheme for $name {
            fn step(
                &mut self,
                equations: &[Equation<'_>],
                s: &[f64],
                t: f64,
                dt: f64,
                dw: &[f64],
            ) -> Vec<f64> {
                let tab: SriTableau = $tableau;
                let i10 = self.aux.i10(dw, dt);
                sri_step(&tab, equations, s, t, dt, dw, &i10)
            }
        }
    };
}

define_sra!(
    Sra1,
    "SRA1 (Rößler 2010): two-stage SRK for additive noise, weak order 2.0, strong order 1.5.",
    SraTableau {
        s: 2,
        a0: vec![vec![0.0, 0.0], vec![3.0 / 4.0, 0.0]],
        b0: vec![vec![0.0, 0.0], vec![3.0 / 2.0, 0.0]],
        c0: vec![0.0, 3.0 / 4.0],
        c1: vec![1.0, 0.0],
        alpha: vec![1.0 / 3.0, 2.0 / 3.0],
        beta1: vec![1.0, 0.0],
        beta2: vec![-1.0, 1.0],
    }
);

define_sra!(
    Sra2,
    "SRA2 (Rößler 2010): alternative two-stage additive-noise SRK.",
    SraTableau {
        s: 2,
        a0: vec![vec![0.0, 0.0], vec![1.0, 0.0]],
        b0: vec![vec![0.0, 0.0], vec![1.0, 0.0]],
        c0: vec![0.0, 1.0],
        c1: vec![0.0, 1.0],
        alpha: vec![1.0 / 2.0, 1.0 / 2.0],
        beta1: vec![1.0, 0.0],
        beta2: vec![-1.0, 1.0],
    }
);

define_sri!(
    Sri1,
    "SRI1 (Rößler-style): two-stage stochastic Heun, strong order 1.0 for general Itô SDEs.",
    SriTableau {
        s: 2,
        a0: vec![vec![0.0, 0.0], vec![1.0, 0.0]],
        a1: vec![vec![0.0, 0.0], vec![1.0, 0.0]],
        b0: vec![vec![0.0, 0.0], vec![0.0, 0.0]],
        b1: vec![vec![0.0, 0.0], vec![1.0, 0.0]],
        c0: vec![0.0, 1.0],
        c1: vec![0.0, 1.0],
        alpha: vec![1.0 / 2.0, 1.0 / 2.0],
        beta1: vec![1.0 / 2.0, 1.0 / 2.0],
        beta2: vec![1.0 / 2.0, -1.0 / 2.0],
        beta3: vec![0.0, 0.0],
        beta4: vec![0.0, 0.0],
    }
);

define_sri!(
    Sri2,
    "SRI2 (Rößler-style): three-stage SRI variant.",
    SriTableau {
        s: 3,
        a0: vec![
            vec![0.0, 0.0, 0.0],
            vec![1.0 / 2.0, 0.0, 0.0],
            vec![0.0, 1.0, 0.0],
        ],
        a1: vec![
            vec![0.0, 0.0, 0.0],
            vec![1.0 / 2.0, 0.0, 0.0],
            vec![0.0, 1.0, 0.0],
        ],
        b0: vec![
            vec![0.0, 0.0, 0.0],
            vec![0.0, 0.0, 0.0],
            vec![0.0, 0.0, 0.0],
        ],
        b1: vec![
            vec![0.0, 0.0, 0.0],
            vec![1.0 / 2.0, 0.0, 0.0],
            vec![0.0, 1.0, 0.0],
        ],
        c0: vec![0.0, 1.0 / 2.0, 1.0],
        c1: vec![0.0, 1.0 / 2.0, 1.0],
        alpha: vec![1.0 / 6.0, 2.0 / 3.0, 1.0 / 6.0],
        beta1: vec![1.0 / 6.0, 2.0 / 3.0, 1.0 / 6.0],
        beta2: vec![1.0 / 2.0, 0.0, -1.0 / 2.0],
        beta3: vec![0.0, 0.0, 0.0],
        beta4: vec![0.0, 0.0, 0.0],
    }
);

define_sri!(
    Sriw1,
    "SRIW1 (Rößler 2010, Section 5.3): four-stage SRK, weak order 2.0, strong order 1.5.",
    SriTableau {
        s: 4,
        a0: vec![
            vec![0.0, 0.0, 0.0, 0.0],
            vec![3.0 / 4.0, 0.0, 0.0, 0.0],
            vec![0.0, 0.0, 0.0, 0.0],
            vec![0.0, 0.0, 0.0, 0.0],
        ],
        a1: vec![
            vec![0.0, 0.0, 0.0, 0.0],
            vec![1.0 / 4.0, 0.0, 0.0, 0.0],
            vec![1.0, 0.0, 0.0, 0.0],
            vec![0.0, 0.0, 1.0 / 4.0, 0.0],
        ],
        b0: vec![
            vec![0.0, 0.0, 0.0, 0.0],
            vec![3.0 / 2.0, 0.0, 0.0, 0.0],
            vec![0.0, 0.0, 0.0, 0.0],
            vec![0.0, 0.0, 0.0, 0.0],
        ],
        b1: vec![
            vec![0.0, 0.0, 0.0, 0.0],
            vec![1.0 / 2.0, 0.0, 0.0, 0.0],
            vec![-1.0, 0.0, 0.0, 0.0],
            vec![-5.0, 3.0, 1.0 / 2.0, 0.0],
        ],
        c0: vec![0.0, 3.0 / 4.0, 0.0, 0.0],
        c1: vec![0.0, 1.0 / 4.0, 1.0, 1.0 / 4.0],
        alpha: vec![1.0 / 3.0, 2.0 / 3.0, 0.0, 0.0],
        beta1: vec![-1.0, 4.0 / 3.0, 2.0 / 3.0, 0.0],
        beta2: vec![-1.0, 4.0 / 3.0, -1.0 / 3.0, 0.0],
        beta3: vec![2.0, -4.0 / 3.0, -2.0 / 3.0, 0.0],
        beta4: vec![-2.0, 5.0 / 3.0, -2.0 / 3.0, 1.0],
    }
);
