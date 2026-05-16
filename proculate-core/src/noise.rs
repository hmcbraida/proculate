//! Random noise increments driving SDE schemes.

use rand::Rng;
use rand_distr::{Distribution, Normal};

/// A source of random increments over a time interval of length `dt`.
///
/// `Increment` is the shape of one draw. For scalar Brownian motion it is
/// `f64`; for nD or multi-source noise it would be a vector / fixed array.
pub trait Noise {
    type Increment;

    fn sample(&mut self, dt: f64) -> Self::Increment;
}

/// Scalar Brownian increments, `dB ~ N(0, dt)`.
pub struct Brownian<R: Rng> {
    rng: R,
    standard: Normal<f64>,
}

impl<R: Rng> Brownian<R> {
    pub fn new(rng: R) -> Self {
        Self {
            rng,
            standard: Normal::new(0.0, 1.0).expect("valid normal parameters"),
        }
    }
}

impl<R: Rng> Noise for Brownian<R> {
    type Increment = f64;

    fn sample(&mut self, dt: f64) -> f64 {
        self.standard.sample(&mut self.rng) * dt.sqrt()
    }
}
