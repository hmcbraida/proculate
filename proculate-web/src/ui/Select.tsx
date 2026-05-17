type SelectOption = {
  readonly value: string;
  readonly label: string;
};

type Props = {
  id?: string;
  value: string;
  options: ReadonlyArray<SelectOption>;
  onChange: (value: string) => void;
  disabled?: boolean;
};

export const Select = ({ id, value, options, onChange, disabled }: Props) => (
  <div className="relative">
    <select
      id={id}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      className="w-full cursor-pointer appearance-none border-2 border-ink bg-paper px-3 py-2 pr-9 text-ink focus:bg-soft focus:outline-none disabled:cursor-not-allowed disabled:border-muted disabled:text-muted"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
    <svg
      viewBox="0 0 24 24"
      className={`pointer-events-none absolute top-1/2 right-2 h-4 w-4 -translate-y-1/2 ${
        disabled ? "text-muted" : "text-ink"
      }`}
      fill="none"
      stroke="currentColor"
      strokeWidth={3}
      strokeLinecap="square"
      aria-hidden="true"
    >
      <path d="M5 9 L12 16 L19 9" />
    </svg>
  </div>
);
