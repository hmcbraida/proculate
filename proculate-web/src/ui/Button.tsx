import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "ghost";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
};

const base =
  "inline-flex items-center justify-center px-4 py-2 font-semibold uppercase tracking-wide " +
  "border-2 border-ink select-none cursor-pointer " +
  "transition-[transform,box-shadow] duration-75 ease-linear " +
  "shadow-[4px_4px_0_0_#111111] " +
  "active:translate-x-[3px] active:translate-y-[3px] active:shadow-[1px_1px_0_0_#111111] " +
  "disabled:cursor-not-allowed disabled:opacity-60 " +
  "focus-visible:outline-none focus-visible:ring-0";

const variants: Record<Variant, string> = {
  primary: "bg-ink text-paper hover:bg-paper hover:text-ink",
  ghost: "bg-paper text-ink hover:bg-ink hover:text-paper",
};

export const Button = ({
  variant = "primary",
  className,
  type,
  ...rest
}: Props) => (
  <button
    type={type ?? "button"}
    className={`${base} ${variants[variant]} ${className ?? ""}`}
    {...rest}
  />
);
