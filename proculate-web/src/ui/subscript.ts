const DIGITS = "₀₁₂₃₄₅₆₇₈₉";

/** Render a non-negative integer using Unicode subscript digits. */
export const subscript = (n: number): string =>
  String(n)
    .split("")
    .map((d) => DIGITS[Number(d)] ?? d)
    .join("");
