import { Field } from "@/ui/Field";
import { Input } from "@/ui/Input";
import { Radio } from "@/ui/Radio";
import { Select } from "@/ui/Select";
import { subscript } from "@/ui/subscript";

export type EquationState = {
  readonly enabled: boolean;
  readonly mu: string;
  readonly sigma: string;
  readonly s0: number;
  readonly noiseIndex: number;
};

type Props = {
  index: number;
  noiseCount: number;
  value: EquationState;
  onChange: (next: EquationState) => void;
};

const parseNum = (s: string, fallback: number): number => {
  const n = Number.parseFloat(s);
  return Number.isFinite(n) ? n : fallback;
};

export const MultiDEquationInput = ({
  index,
  noiseCount,
  value,
  onChange,
}: Props) => {
  const { enabled } = value;
  const sub = subscript(index);
  const muId = `mu-${index}`;
  const sigmaId = `sigma-${index}`;
  const s0Id = `s0-${index}`;
  const noiseId = `noise-${index}`;
  const noiseOptions = Array.from({ length: noiseCount }, (_, i) => ({
    value: String(i),
    label: `B${subscript(i)}`,
  }));

  return (
    <div
      className={`flex h-full flex-col divide-y-2 bg-paper ${
        enabled
          ? "divide-ink border-2 border-ink"
          : "divide-muted border-2 border-muted"
      }`}
    >
      <div className="flex items-center gap-3 p-3">
        <span className="text-xs font-bold uppercase tracking-widest text-ink">
          equation S{sub}
        </span>
        <Radio
          name={`equation-${index}`}
          variant="segmented"
          value={enabled ? "on" : "off"}
          options={[
            { value: "on", label: "enabled" },
            { value: "off", label: "disabled" },
          ]}
          onChange={(v) => onChange({ ...value, enabled: v === "on" })}
        />
      </div>
      <div className="p-3">
        <Field label={`μ${sub}(s, t)`} htmlFor={muId}>
          <Input
            id={muId}
            value={value.mu}
            disabled={!enabled}
            spellCheck={false}
            autoComplete="off"
            onChange={(e) => onChange({ ...value, mu: e.target.value })}
            placeholder={`0.05 * s${index}`}
          />
        </Field>
      </div>
      <div className="p-3">
        <Field label={`σ${sub}(s, t)`} htmlFor={sigmaId}>
          <Input
            id={sigmaId}
            value={value.sigma}
            disabled={!enabled}
            spellCheck={false}
            autoComplete="off"
            onChange={(e) => onChange({ ...value, sigma: e.target.value })}
            placeholder={`0.3 * s${index}`}
          />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3 p-3">
        <Field label={`S${sub} initial value`} htmlFor={s0Id}>
          <Input
            id={s0Id}
            type="number"
            step="any"
            disabled={!enabled}
            value={value.s0}
            onChange={(e) =>
              onChange({ ...value, s0: parseNum(e.target.value, value.s0) })
            }
          />
        </Field>
        <Field label="noise source" htmlFor={noiseId}>
          <Select
            id={noiseId}
            disabled={!enabled}
            value={String(value.noiseIndex)}
            options={noiseOptions}
            onChange={(v) =>
              onChange({ ...value, noiseIndex: Number.parseInt(v, 10) })
            }
          />
        </Field>
      </div>
    </div>
  );
};
