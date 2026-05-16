import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
};

const navLink =
  "px-3 py-1 text-sm font-bold uppercase tracking-widest hover:bg-paper hover:text-ink";

export const AppLayout = ({ children }: Props) => (
  <div className="flex min-h-screen flex-col bg-paper text-ink">
    <header className="flex items-center justify-between border-b-2 border-ink bg-ink px-4 py-2 text-paper">
      <Link
        to="/1d-sde-solve"
        className="text-lg font-extrabold uppercase tracking-[0.2em]"
      >
        proculate
      </Link>
      <nav className="flex">
        <Link
          to="/1d-sde-solve"
          className={navLink}
          activeProps={{ className: `${navLink} bg-paper text-ink` }}
        >
          1d sde
        </Link>
      </nav>
    </header>
    <main className="mx-auto w-3/4 flex-1 py-4">{children}</main>
  </div>
);
