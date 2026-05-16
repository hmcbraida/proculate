import type { OneDSdeProblem } from "@/protocol/solver";
import { Button } from "@/ui/Button";
import { Field } from "@/ui/Field";
import { Input } from "@/ui/Input";

export type OneDInputState = OneDSdeProblem & {
  readonly paths: number;
};

type Props = {
  value: OneDInputState;
  onChange: (next: OneDInputState) => void;
  onSubmit: () => void;
  busy: boolean;
};

const parseNum = (s: string, fallback: number): number => {
  const n = Number.parseFloat(s);
  return Number.isFinite(n) ? n : fallback;
};

export const OneDSdeInput = ({ value, onChange, onSubmit, busy }: Props) => (
  <form
    className="flex flex-col divide-y-2 divide-ink"
    onSubmit={(e) => {
      e.preventDefault();
      onSubmit();
    }}
  >
    <div className="p-3">
      <Field label="μ(S, t)" htmlFor="mu">
        <Input
          id="mu"
          value={value.mu}
          spellCheck={false}
          autoComplete="off"
          onChange={(e) => onChange({ ...value, mu: e.target.value })}
          placeholder="0.05 * S"
        />
      </Field>
    </div>
    <div className="p-3">
      <Field label="σ(S, t)" htmlFor="sigma">
        <Input
          id="sigma"
          value={value.sigma}
          spellCheck={false}
          autoComplete="off"
          onChange={(e) => onChange({ ...value, sigma: e.target.value })}
          placeholder="0.3 * S"
        />
      </Field>
    </div>
    <div className="grid grid-cols-2 gap-3 p-3 md:grid-cols-5">
      <Field label="S₀" htmlFor="s0">
        <Input
          id="s0"
          type="number"
          step="any"
          value={value.s0}
          onChange={(e) =>
            onChange({ ...value, s0: parseNum(e.target.value, value.s0) })
          }
        />
      </Field>
      <Field label="t₀" htmlFor="t0">
        <Input
          id="t0"
          type="number"
          step="any"
          value={value.t0}
          onChange={(e) =>
            onChange({ ...value, t0: parseNum(e.target.value, value.t0) })
          }
        />
      </Field>
      <Field label="t_end" htmlFor="tEnd">
        <Input
          id="tEnd"
          type="number"
          step="any"
          value={value.tEnd}
          onChange={(e) =>
            onChange({ ...value, tEnd: parseNum(e.target.value, value.tEnd) })
          }
        />
      </Field>
      <Field label="dt" htmlFor="dt">
        <Input
          id="dt"
          type="number"
          step="any"
          value={value.dt}
          onChange={(e) =>
            onChange({ ...value, dt: parseNum(e.target.value, value.dt) })
          }
        />
      </Field>
      <Field label="paths" htmlFor="paths">
        <Input
          id="paths"
          type="number"
          min={1}
          step={1}
          value={value.paths}
          onChange={(e) =>
            onChange({
              ...value,
              paths: Math.max(
                1,
                Math.round(parseNum(e.target.value, value.paths)),
              ),
            })
          }
        />
      </Field>
    </div>
    <div className="p-3">
      <Button type="submit" disabled={busy}>
        {busy ? "solving…" : "solve"}
      </Button>
    </div>
  </form>
);
