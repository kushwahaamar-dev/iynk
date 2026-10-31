"use client";

import { useState } from "react";
import type { ComponentProps } from "react";
import { TextInput } from "@/components/ui";

const parse = (text: string): number | undefined => {
  const n = text.trim() === "" ? Number.NaN : Number(text);
  return Number.isFinite(n) ? n : undefined;
};

const format = (value: number | undefined): string => (value === undefined ? "" : String(value));

type NumberFieldProps = Omit<ComponentProps<typeof TextInput>, "value" | "onChange" | "type"> & {
  value: number | undefined;
  /** Called with the number the text holds, or `undefined` while it holds none. */
  onValue: (value: number | undefined) => void;
};

/** A number field that keeps what the person is typing ("2.", "1e") until it reads as a number. */
export function NumberField({ value, onValue, ...rest }: NumberFieldProps) {
  const [text, setText] = useState(format(value));
  const [seen, setSeen] = useState(value);
  if (value !== seen) {
    setSeen(value);
    if (parse(text) !== value) setText(format(value));
  }
  return (
    <TextInput
      {...rest}
      inputMode="decimal"
      value={text}
      onChange={(e) => {
        setText(e.target.value);
        const next = parse(e.target.value);
        setSeen(next);
        onValue(next);
      }}
      className="font-mono tabular-nums"
    />
  );
}
