type Props = {
  error: string | null;
  notes: ReadonlyArray<string>;
};

const ROW_H = "min-h-[2.25rem]";

export const StderrBox = ({ error, notes }: Props) => {
  const hasContent = error !== null || notes.length > 0;
  return (
    <div
      className={`${ROW_H} flex items-center px-3 py-2 text-sm font-medium ${
        hasContent
          ? error
            ? "bg-warn text-paper"
            : "bg-soft text-ink"
          : "bg-paper text-transparent"
      }`}
      aria-live="polite"
    >
      <span className="font-mono">
        {error
          ? `error: ${error}`
          : notes.length > 0
            ? notes.join("  •  ")
            : "—"}
      </span>
    </div>
  );
};
