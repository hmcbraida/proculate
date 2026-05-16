//! WASM bindings.
//!
//! The job here is purely glue: parse `mu` and `sigma` from algebraic
//! strings into `(S, t) -> f64` closures, then hand off to
//! [`proculate_core::one_d::solve_milstein`]. The numerics live in
//! `proculate-core`.

use meval::Expr;
use proculate_core::one_d::{solve_milstein, SolverParams};
use rand::Rng;
use wasm_bindgen::prelude::*;

/// Output of [`solve_sde_milstein`], exposed to JS as two `Float64Array`s.
#[wasm_bindgen]
pub struct WebResult {
    times: Vec<f64>,
    values: Vec<f64>,
}

#[wasm_bindgen]
impl WebResult {
    #[wasm_bindgen(getter)]
    pub fn times(&self) -> Vec<f64> {
        self.times.clone()
    }

    #[wasm_bindgen(getter)]
    pub fn values(&self) -> Vec<f64> {
        self.values.clone()
    }
}

/// Parse `mu_expr` and `sigma_expr` as functions of variables `S` and `t`
/// (in that order) and solve `dS = mu(S,t) dt + sigma(S,t) dB` with Milstein.
///
/// Example expressions: `"0.05 * S"`, `"0.3 * S"`, `"sin(t) - S"`.
#[wasm_bindgen]
pub fn solve_sde_milstein(
    mu_expr: &str,
    sigma_expr: &str,
    s0: f64,
    t0: f64,
    t_end: f64,
    dt: f64,
) -> Result<WebResult, JsError> {
    let mu_expr: Expr = mu_expr
        .parse()
        .map_err(|e: meval::Error| JsError::new(&format!("mu parse error: {e}")))?;
    let sigma_expr: Expr = sigma_expr
        .parse()
        .map_err(|e: meval::Error| JsError::new(&format!("sigma parse error: {e}")))?;

    let mu = mu_expr
        .clone()
        .bind2("S", "t")
        .map_err(|e| JsError::new(&format!("mu bind error: {e}")))?;
    let sigma = sigma_expr
        .clone()
        .bind2("S", "t")
        .map_err(|e| JsError::new(&format!("sigma bind error: {e}")))?;

    let mut rng = rand::thread_rng();
    let seed: u64 = rng.gen();

    let params = SolverParams {
        s0,
        t0,
        t_end,
        dt,
        seed,
    };
    let result = solve_milstein(mu, sigma, params);
    Ok(WebResult {
        times: result.times,
        values: result.values,
    })
}
