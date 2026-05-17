> **Warning: This is an educational toy. Do not let it touch anything important.**

# proculate

A stochastic differential equation solver.

## Packages

### proculate-core

This is the most important part of the stack.

Implements 1D and multi-dimensional SDE solvers. Supports multiple schemes for each of the two cases:

- **1D**: Euler-Maruyama, Milstein
- **Multi-D**: Euler-Maruyama, Milstein, SRA1, SRA2, SRI1, SRI2, SRIW1

### proculate-wasm

Bridges the Rust solvers to JavaScript.

### proculate-web

A browser UI for running and visualising SDE simulations.

---

## Building the frontend

```sh
cd proculate-web
bun run build:wasm  # build the wasm bundle
bun run build  # build the frontend

# for development ;)
bun run dev
```

---

## Testing, linting, etc

### Rust

```sh
cargo test
cargo fmt
cargo clippy
```

### Web

```sh
cd proculate-web
bun run lint
# bun run lint:fix
```
