import type { ReactNode } from "react";

type Props = {
  labels: ReadonlyArray<ReactNode>;
  children: ReadonlyArray<ReactNode>;
  active: number;
  onSelect: (index: number) => void;
  /** Diagonal stack with all panels visible (input), or a plain single panel. */
  variant?: "stack" | "plain";
  /** Height of one panel, in px. Required for the stack variant. */
  bodyHeight?: number;
  /** Diagonal step between stacked panels, in px. */
  offset?: number;
};

const tabBase =
  "border-2 border-ink px-3 py-1 text-xs font-bold uppercase tracking-widest " +
  "-ml-0.5 first:ml-0";

export const Tabs = ({
  labels,
  children,
  active,
  onSelect,
  variant = "stack",
  bodyHeight = 280,
  offset = 8,
}: Props) => {
  const count = children.length;

  const bar = (
    <div className="flex">
      {labels.map((label, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onSelect(i)}
          className={`${tabBase} ${
            i === active
              ? "bg-ink text-paper"
              : "bg-paper text-ink hover:bg-soft"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );

  if (variant === "plain") {
    return (
      <div className="flex flex-col gap-3">
        {bar}
        <div>{children[active]}</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {bar}
      <div
        className="relative"
        style={{ height: bodyHeight + (count - 1) * offset }}
      >
        {children.map((child, i) => (
          <div
            key={i}
            className={i === active ? "" : "pointer-events-none opacity-35"}
            style={{
              position: "absolute",
              top: i * offset,
              left: i * offset,
              right: (count - 1 - i) * offset,
              bottom: (count - 1 - i) * offset,
              zIndex: i === active ? count + 1 : count - i,
            }}
          >
            {child}
          </div>
        ))}
      </div>
    </div>
  );
};
