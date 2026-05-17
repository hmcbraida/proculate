type Option<T extends string> = {
  readonly value: T;
  readonly label: string;
};

type Variant = "square" | "segmented";

type Props<T extends string> = {
  value: T;
  options: ReadonlyArray<Option<T>>;
  onChange: (value: T) => void;
  name: string;
  variant?: Variant;
};

const segBase =
  "relative border-2 border-ink px-3 py-1 text-xs font-bold uppercase " +
  "tracking-widest select-none cursor-pointer -ml-0.5 first:ml-0";

export const Radio = <T extends string>({
  value,
  options,
  onChange,
  name,
  variant = "square",
}: Props<T>) => {
  if (variant === "segmented") {
    return (
      <div className="flex">
        {options.map((opt) => {
          const selected = opt.value === value;
          return (
            <label
              key={opt.value}
              className={`${segBase} ${
                selected
                  ? "bg-ink text-paper"
                  : "bg-paper text-ink hover:bg-soft"
              }`}
            >
              <input
                type="radio"
                name={name}
                checked={selected}
                onChange={() => onChange(opt.value)}
                className="absolute inset-0 m-0 cursor-pointer opacity-0"
              />
              {opt.label}
            </label>
          );
        })}
      </div>
    );
  }

  return (
    <div className="flex gap-4">
      {options.map((opt) => {
        const selected = opt.value === value;
        return (
          <label
            key={opt.value}
            className="inline-flex cursor-pointer items-center gap-2 select-none"
          >
            <span className="relative inline-flex h-5 w-5 items-center justify-center border-2 border-ink bg-paper">
              <input
                type="radio"
                name={name}
                checked={selected}
                onChange={() => onChange(opt.value)}
                className="absolute inset-0 m-0 cursor-pointer opacity-0"
              />
              {selected ? <span className="h-2.5 w-2.5 bg-ink" /> : null}
            </span>
            <span className="text-xs font-bold uppercase tracking-widest text-ink">
              {opt.label}
            </span>
          </label>
        );
      })}
    </div>
  );
};
