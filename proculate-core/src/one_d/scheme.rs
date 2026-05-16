//! Time-stepping schemes for 1D SDEs.

use crate::numeric::central_diff;

/// One integration step of a 1D SDE driven by a scalar noise increment `dw`.
///
/// The trait is intentionally narrow so other schemes (Heun, predictor-
/// corrector, stochastic Runge-Kutta, ...) can drop in without touching
/// the solver driver.
pub trait Scheme {
    fn step<M, S>(&self, mu: &M, sigma: &S, s: f64, t: f64, dt: f64, dw: f64) -> f64
    where
        M: Fn(f64, f64) -> f64,
        S: Fn(f64, f64) -> f64;
}

/// Euler-Maruyama: `S_{n+1} = S_n + mu*dt + sigma*dW`.
pub struct EulerMaruyama;

impl Scheme for EulerMaruyama {
    fn step<M, S>(&self, mu: &M, sigma: &S, s: f64, t: f64, dt: f64, dw: f64) -> f64
    where
        M: Fn(f64, f64) -> f64,
        S: Fn(f64, f64) -> f64,
    {
        s + mu(s, t) * dt + sigma(s, t) * dw
    }
}

/// Milstein scheme (strong order 1.0):
/// `S_{n+1} = S_n + mu dt + sigma dW + 0.5 sigma sigma' (dW^2 - dt)`.
///
/// The derivative `sigma' = d sigma / d S` is computed by central
/// differences so that callers can pass plain `(s, t) -> f64` closures.
pub struct Milstein;

impl Scheme for Milstein {
    fn step<M, S>(&self, mu: &M, sigma: &S, s: f64, t: f64, dt: f64, dw: f64) -> f64
    where
        M: Fn(f64, f64) -> f64,
        S: Fn(f64, f64) -> f64,
    {
        let sig = sigma(s, t);
        let dsig_ds = central_diff(sigma, s, t);
        s + mu(s, t) * dt + sig * dw + 0.5 * sig * dsig_ds * (dw * dw - dt)
    }
}
