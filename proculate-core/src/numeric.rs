//! Numerical helpers used by the schemes.

/// Central-difference approximation of `df/ds` at `(s, t)`.
///
/// Uses a step that scales with `|s|` to keep relative error bounded for
/// large states while still working near the origin.
pub fn central_diff<F: Fn(f64, f64) -> f64>(f: &F, s: f64, t: f64) -> f64 {
    let h = 1e-6_f64.max(1e-6 * s.abs());
    (f(s + h, t) - f(s - h, t)) / (2.0 * h)
}
