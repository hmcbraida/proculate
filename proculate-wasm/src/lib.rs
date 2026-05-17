//! WASM bindings.
//!
//! The job here is purely glue: parse `mu` and `sigma` from algebraic
//! strings into `(S, t) -> f64` closures, then hand off to
//! [`proculate_core::one_d::solve_milstein`]. The numerics live in
//! `proculate-core`.

use meval::{Context, Expr};
use proculate_core::multi_d::{
    solve, Equation, EulerMaruyama, Milstein, MultiSolverParams, Sra1, Sra2, Sri1, Sri2, Sriw1,
};
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
        .to_lowercase()
        .parse()
        .map_err(|e: meval::Error| JsError::new(&format!("mu parse error: {e}")))?;
    let sigma_expr: Expr = sigma_expr
        .to_lowercase()
        .parse()
        .map_err(|e: meval::Error| JsError::new(&format!("sigma parse error: {e}")))?;

    let mu = mu_expr
        .clone()
        .bind2("s", "t")
        .map_err(|e| JsError::new(&format!("mu bind error: {e}")))?;
    let sigma = sigma_expr
        .clone()
        .bind2("s", "t")
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

// ---------------------------------------------------------------------------
// Multi-dimensional output
// ---------------------------------------------------------------------------

/// Output of multi-dimensional SDE solvers.
///
/// Call `component(i)` to retrieve the trajectory of the i-th state variable
/// as a `Float64Array`. `times()` returns the shared time grid, and `dim()`
/// returns the number of equations.
#[wasm_bindgen]
pub struct WebMultiResult {
    times: Vec<f64>,
    values: Vec<Vec<f64>>,
}

#[wasm_bindgen]
impl WebMultiResult {
    #[wasm_bindgen(getter)]
    pub fn times(&self) -> Vec<f64> {
        self.times.clone()
    }

    /// Number of state-variable components (equations in the system).
    #[wasm_bindgen(getter)]
    pub fn dim(&self) -> u32 {
        self.values.first().map(|v| v.len() as u32).unwrap_or(0)
    }

    /// Trajectory of the `idx`-th state variable.
    pub fn component(&self, idx: u32) -> Vec<f64> {
        self.values.iter().map(|v| v[idx as usize]).collect()
    }
}

// ---------------------------------------------------------------------------
// Expression parsing helpers
// ---------------------------------------------------------------------------

// Build a closure `(&[f64], f64) -> f64` from a parsed `Expr`.
// State variables are named `s0, s1, ..., s{n-1}`; time is `t`.
fn make_eval(expr: Expr) -> impl Fn(&[f64], f64) -> f64 + 'static {
    move |s: &[f64], t: f64| -> f64 {
        let mut ctx = Context::new();
        for (j, &v) in s.iter().enumerate() {
            ctx.var(format!("s{j}"), v);
        }
        ctx.var("t", t);
        expr.eval_with_context(ctx).unwrap_or(f64::NAN)
    }
}

// Parse `mu_exprs`, `sigma_exprs`, and `noise_indices` into a `Vec<Equation>`.
// All three slices must have the same length. Expressions use variables
// `s0, s1, ..., s{n-1}` for the state components and `t` for time.
fn parse_equations(
    mu_exprs: &[JsValue],
    sigma_exprs: &[JsValue],
    noise_indices: &[u32],
) -> Result<Vec<Equation<'static>>, JsError> {
    let n = mu_exprs.len();
    if sigma_exprs.len() != n {
        return Err(JsError::new(
            "mu_exprs and sigma_exprs must have the same length",
        ));
    }
    if noise_indices.len() != n {
        return Err(JsError::new(
            "noise_indices must have the same length as mu_exprs",
        ));
    }

    (0..n)
        .map(|i| {
            let mu_str = mu_exprs[i]
                .as_string()
                .ok_or_else(|| JsError::new(&format!("mu_exprs[{i}] is not a string")))?
                .to_lowercase();
            let sigma_str = sigma_exprs[i]
                .as_string()
                .ok_or_else(|| JsError::new(&format!("sigma_exprs[{i}] is not a string")))?
                .to_lowercase();

            let mu_expr: Expr = mu_str.parse().map_err(|e: meval::Error| {
                JsError::new(&format!("mu_exprs[{i}] parse error: {e}"))
            })?;
            let sigma_expr: Expr = sigma_str.parse().map_err(|e: meval::Error| {
                JsError::new(&format!("sigma_exprs[{i}] parse error: {e}"))
            })?;

            Ok(Equation::new(
                make_eval(mu_expr),
                make_eval(sigma_expr),
                noise_indices[i] as usize,
            ))
        })
        .collect()
}

// ---------------------------------------------------------------------------
// Multi-dimensional solver exports
// ---------------------------------------------------------------------------

macro_rules! solve_multi {
    ($fn_name:ident, $mk_scheme:expr) => {
        /// Solve a system of SDEs using the named scheme.
        ///
        /// `mu_exprs` and `sigma_exprs` are JS arrays of strings, one per
        /// equation. Variables in each expression: `s0, s1, ..., s{n-1}` for
        /// the state components and `t` for time.
        /// `noise_indices` (`Uint32Array`) selects the driving Wiener process
        /// for each equation. `s0` (`Float64Array`) sets the initial state.
        #[wasm_bindgen]
        pub fn $fn_name(
            mu_exprs: Box<[JsValue]>,
            sigma_exprs: Box<[JsValue]>,
            noise_indices: Box<[u32]>,
            s0: Box<[f64]>,
            t0: f64,
            t_end: f64,
            dt: f64,
        ) -> Result<WebMultiResult, JsError> {
            let mut rng = rand::thread_rng();
            let seed: u64 = rng.gen();

            let equations = parse_equations(&mu_exprs, &sigma_exprs, &noise_indices)?;
            if s0.len() != equations.len() {
                return Err(JsError::new("s0 length must equal the number of equations"));
            }

            let params = MultiSolverParams {
                s0: s0.into_vec(),
                t0,
                t_end,
                dt,
                seed,
            };
            #[allow(clippy::redundant_closure_call)]
            let mut scheme = ($mk_scheme)(seed);
            let result = solve(&mut scheme, &equations, params);
            Ok(WebMultiResult {
                times: result.times,
                values: result.values,
            })
        }
    };
}

solve_multi!(solve_sde_multi_euler_maruyama, |_| EulerMaruyama);
solve_multi!(solve_sde_multi_milstein, |_| Milstein);
solve_multi!(solve_sde_multi_sra1, Sra1::new);
solve_multi!(solve_sde_multi_sra2, Sra2::new);
solve_multi!(solve_sde_multi_sri1, Sri1::new);
solve_multi!(solve_sde_multi_sri2, Sri2::new);
solve_multi!(solve_sde_multi_sriw1, Sriw1::new);
