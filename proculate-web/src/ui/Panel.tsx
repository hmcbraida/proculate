import type { ReactNode } from "react";

type Props = {
  title?: string;
  children: ReactNode;
  className?: string;
};

export const Panel = ({ title, children, className }: Props) => (
  <section
    className={`flex flex-col border-2 border-ink bg-paper ${className ?? ""}`}
  >
    {title ? (
      <header className="border-b-2 border-ink bg-ink px-3 py-1 text-xs font-bold uppercase tracking-widest text-paper">
        {title}
      </header>
    ) : null}
    <div className="flex flex-1 flex-col">{children}</div>
  </section>
);
