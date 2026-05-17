import { useState } from "react";

import {
  type EquationState,
  MultiDEquationInput,
} from "@/features/MultiDEquationInput";
import type { MultiDScheme } from "@/protocol/solver";
import { Button } from "@/ui/Button";
import { Field } from "@/ui/Field";
import { Input } from "@/ui/Input";
import { Select } from "@/ui/Select";
import { subscript } from "@/ui/subscript";
import { Tabs } from "@/ui/Tabs";

export type MultiDInputState = {
  readonly equations: ReadonlyArray<EquationState>;
  readonly scheme: MultiDScheme;
  readonly t0: number;
  readonly tEnd: number;
  readonly dt: number;
  readonly paths: number;
};

const SCHEME_OPTIONS: ReadonlyArray<{ value: MultiDScheme; label: string }> = [
  { value: "euler-maruyama", label: "euler-maruyama" },
  { value: "milstein", label: "milstein" },
  { value: "sra1", label: "sra1" },
  { value: "sra2", label: "sra2" },
  { value: "sri1", label: "sri1" },
  { value: "sri2", label: "sri2" },
  { value: "sriw1", label: "sriw1" },
];

type Props = {
  value: MultiDInputState;
  onChange: (next: MultiDInputState) => void;
  onSubmit: () => void;
  busy: boolean;
};

const parseNum = (s: string, fallback: number): number => {
  const n = Number.parseFloat(s);
  return Number.isFinite(n) ? n : fallback;
};

export const MultiDSdeInput = ({ value, onChange, onSubmit, busy }: Props) => {
  const [active, setActive] = useState(0);

  const setEquation = (index: number, next: EquationState) => {
    onChange({
      ...value,
      equations: value.equations.map((eq, i) => (i === index ? next : eq)),
    });
  };

  return (
    <form
      className="flex flex-col divide-y-2 divide-ink"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <div className="p-3">
        <Tabs
          active={active}
          onSelect={setActive}
          bodyHeight={320}
          labels={value.equations.map((_, i) => `S${subscript(i)}`)}
        >
          {value.equations.map((eq, i) => (
            <MultiDEquationInput
              key={i}
              index={i}
              noiseCount={value.equations.length}
              value={eq}
              onChange={(next) => setEquation(i, next)}
            />
          ))}
        </Tabs>
      </div>
      <div className="grid grid-cols-2 gap-3 p-3 md:grid-cols-5">
        <Field label="scheme" htmlFor="md-scheme">
          <Select
            id="md-scheme"
            value={value.scheme}
            options={SCHEME_OPTIONS}
            onChange={(s) => onChange({ ...value, scheme: s as MultiDScheme })}
          />
        </Field>
        <Field label="t₀" htmlFor="md-t0">
          <Input
            id="md-t0"
            type="number"
            step="any"
            value={value.t0}
            onChange={(e) =>
              onChange({ ...value, t0: parseNum(e.target.value, value.t0) })
            }
          />
        </Field>
        <Field label="t_end" htmlFor="md-tEnd">
          <Input
            id="md-tEnd"
            type="number"
            step="any"
            value={value.tEnd}
            onChange={(e) =>
              onChange({ ...value, tEnd: parseNum(e.target.value, value.tEnd) })
            }
          />
        </Field>
        <Field label="dt" htmlFor="md-dt">
          <Input
            id="md-dt"
            type="number"
            step="any"
            value={value.dt}
            onChange={(e) =>
              onChange({ ...value, dt: parseNum(e.target.value, value.dt) })
            }
          />
        </Field>
        <Field label="paths" htmlFor="md-paths">
          <Input
            id="md-paths"
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
};
