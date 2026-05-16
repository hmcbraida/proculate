//! Parameters, equations, and outputs for multi-dimensional SDE solvers.

/// A single scalar equation `dS_i = mu_i(S, t) dt + sigma_i(S, t) dW_{k_i}`.
///
/// `mu` and `sigma` receive the full state vector `S` so components can be
/// coupled through drift and diffusion. `noise_index` selects which of the
/// independent Wiener processes drives this equation; equations that share
/// an index share their Brownian path (perfect correlation).
pub struct Equation<'a> {
    pub mu: Box<dyn Fn(&[f64], f64) -> f64 + 'a>,
    pub sigma: Box<dyn Fn(&[f64], f64) -> f64 + 'a>,
    pub noise_index: usize,
}

impl<'a> Equation<'a> {
    pub fn new<M, S>(mu: M, sigma: S, noise_index: usize) -> Self
    where
        M: Fn(&[f64], f64) -> f64 + 'a,
        S: Fn(&[f64], f64) -> f64 + 'a,
    {
        Self {
            mu: Box::new(mu),
            sigma: Box::new(sigma),
            noise_index,
        }
    }
}

#[derive(Debug, Clone)]
pub struct MultiSolverParams {
    pub s0: Vec<f64>,
    pub t0: f64,
    pub t_end: f64,
    pub dt: f64,
    pub seed: u64,
}

impl MultiSolverParams {
    pub fn step_count(&self) -> usize {
        let span = (self.t_end - self.t0).max(0.0);
        (span / self.dt).round() as usize
    }
}

/// Trajectory output. `values[step][component]` is the state of the system
/// at the corresponding time.
#[derive(Debug, Clone)]
pub struct MultiSolverResult {
    pub times: Vec<f64>,
    pub values: Vec<Vec<f64>>,
}

impl MultiSolverResult {
    /// Extract the trajectory of a single component.
    pub fn component(&self, idx: usize) -> Vec<f64> {
        self.values.iter().map(|v| v[idx]).collect()
    }
}
