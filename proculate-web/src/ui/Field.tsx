import type { ReactNode } from "react";

type Props = {
  label: string;
  htmlFor?: string;
  children: ReactNode;
  className?: string;
};

export const Field = ({ label, htmlFor, children, className }: Props) => (
  <label htmlFor={htmlFor} className={`flex flex-col gap-1 ${className ?? ""}`}>
    <span className="text-xs font-bold uppercase tracking-widest text-ink">
      {label}
    </span>
    {children}
  </label>
);
