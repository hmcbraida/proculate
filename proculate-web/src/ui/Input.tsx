import type { InputHTMLAttributes } from "react";

type Props = InputHTMLAttributes<HTMLInputElement>;

const base =
  "w-full px-3 py-2 bg-paper text-ink border-2 border-ink " +
  "placeholder:text-muted " +
  "focus:outline-none focus:bg-soft " +
  "disabled:cursor-not-allowed disabled:border-muted disabled:text-muted";

export const Input = ({ className, ...rest }: Props) => (
  <input className={`${base} ${className ?? ""}`} {...rest} />
);
