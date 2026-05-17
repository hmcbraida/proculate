import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
};

const navLink =
  "px-3 py-1 text-xl font-bold uppercase tracking-widest hover:bg-paper hover:text-ink";

export const AppLayout = ({ children }: Props) => (
  <div className="flex min-h-screen flex-col bg-paper text-ink">
    <header className="flex items-center justify-between border-b-2 border-ink bg-ink px-4 py-2 text-paper">
      <Link
        to="/1d-sde-solve"
        className="text-xl font-extrabold uppercase tracking-[0.2em]"
      >
        proculate: SDE solver
      </Link>
      <nav className="flex">
        <p className="px-3 py-1 text-md font-bold uppercase tracking-widest">
          One-dimensional or multi-dimensional:
        </p>
        <Link
          to="/1d-sde-solve"
          className={navLink}
          activeProps={{ className: `${navLink} bg-paper text-ink` }}
        >
          1d sde
        </Link>
        <Link
          to="/multi-d-sde-solve"
          className={navLink}
          activeProps={{ className: `${navLink} bg-paper text-ink` }}
        >
          multi-d sde
        </Link>
      </nav>
    </header>
    <main className="mx-auto w-3/4 flex-1 py-4">{children}</main>
    <footer className="flex justify-center my-5">
      <a
        className="text-3xl text-blue-600 underline"
        href="https://github.com/hmcbraida/proculate"
      >
        Source code
      </a>
    </footer>
  </div>
);
