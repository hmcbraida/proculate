//! Stochastic differential equation solvers.
//!
//! The crate is organised so that the 1D, Brownian-driven case lives in
//! [`one_d`] and the noise source is abstracted through [`noise::Noise`].
//! When nD systems or non-Brownian processes (e.g. compound Poisson) are
//! added, they should slot in alongside without disturbing this layout.

pub mod noise;
pub mod numeric;
pub mod one_d;
