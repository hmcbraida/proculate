//! Parameters and outputs for 1D SDE solvers.

#[derive(Debug, Clone, Copy)]
pub struct SolverParams {
    pub s0: f64,
    pub t0: f64,
    pub t_end: f64,
    pub dt: f64,
    pub seed: u64,
}

impl SolverParams {
    /// Number of integration steps that fit in `[t0, t_end]` at step `dt`.
    pub fn step_count(&self) -> usize {
        let span = (self.t_end - self.t0).max(0.0);
        (span / self.dt).round() as usize
    }
}

#[derive(Debug, Clone)]
pub struct SolverResult {
    pub times: Vec<f64>,
    pub values: Vec<f64>,
}
