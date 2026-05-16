//! 1D scalar SDEs of the form `dS = mu(S, t) dt + sigma(S, t) dB`.

mod params;
mod scheme;
mod solve;

pub use params::{SolverParams, SolverResult};
pub use scheme::{EulerMaruyama, Milstein, Scheme};
pub use solve::{solve, solve_milstein, solve_with_noise};
