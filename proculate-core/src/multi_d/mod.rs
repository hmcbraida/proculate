//! Multi-dimensional, interdependent SDE systems of the form
//!
//! ```text
//!   dS_i = mu_i(S_1, ..., S_n, t) dt + sigma_i(S_1, ..., S_n, t) dW_{k_i}
//! ```
//!
//! Each [`Equation`] picks its own noise direction `k_i` so multiple
//! components can share a single Wiener process (perfect correlation) or
//! use independent processes.

mod params;
mod scheme;
mod solve;

pub use params::{Equation, MultiSolverParams, MultiSolverResult};
pub use scheme::{
    EulerMaruyama, Milstein, MultiScheme, Sra1, Sra2, SraTableau, Sri1, Sri2, SriTableau, Sriw1,
};
pub use solve::{solve, solve_with_noise};
