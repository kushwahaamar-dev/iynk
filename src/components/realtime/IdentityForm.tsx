"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import { Button, cx } from "@/components/ui";
import { MAX_NAME_LENGTH, PEER_COLORS, saveIdentity, type Identity } from "@/lib/realtime";
import type { TogetherT } from "./messages";

/** Name and colour, chosen by the person and kept on this device (H11). */
export function IdentityForm({
  t,
  initial,
  submitLabel,
  onDone,
  onCancel,
}: {
  t: TogetherT;
  initial: Identity | null;
  submitLabel: string;
  onDone?: () => void;
  onCancel?: () => void;
}) {
  const id = useId();
  const [name, setName] = useState(initial?.name ?? "");
  const [color, setColor] = useState<string>(initial?.color ?? PEER_COLORS[0].hex);
  const [missing, setMissing] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const clean = name.trim();

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!clean) {
      setMissing(true);
      nameRef.current?.focus();
      return;
    }
    saveIdentity({ name: clean, color });
    onDone?.();
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-3" aria-labelledby={`${id}-title`} noValidate>
      <div>
        <h3 id={`${id}-title`} className="font-head text-base font-bold">
          {t("identity.title")}
        </h3>
        <p className="text-sm text-muted">{t("identity.hint")}</p>
      </div>
      <label className="flex flex-col gap-1 text-sm font-semibold" htmlFor={`${id}-name`}>
        {t("identity.name")}
        <input
          ref={nameRef}
          id={`${id}-name`}
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            if (event.target.value.trim()) setMissing(false);
          }}
          maxLength={MAX_NAME_LENGTH}
          autoComplete="nickname"
          required
          aria-invalid={missing}
          aria-describedby={missing ? `${id}-missing` : undefined}
          className="min-h-11 rounded-ink-sm border-2 border-line bg-surface px-3 font-body text-base font-normal text-ink aria-invalid:border-bad"
        />
      </label>
      {missing ? (
        <p id={`${id}-missing`} className="-mt-1 text-sm text-bad">
          {t("identity.missing")}
        </p>
      ) : null}
      <fieldset className="flex flex-col gap-1">
        <legend className="mb-1 text-sm font-semibold">{t("identity.color")}</legend>
        <div className="flex flex-wrap gap-2">
          {PEER_COLORS.map((swatch) => (
            <label
              key={swatch.id}
              className={cx(
                "relative inline-flex size-11 cursor-pointer items-center justify-center rounded-full border-2 border-line has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-cobalt",
                color === swatch.hex && "shadow-ink-sm ring-2 ring-ink ring-offset-2 ring-offset-paper",
              )}
              style={{ backgroundColor: swatch.hex }}
            >
              <input
                type="radio"
                name={`${id}-color`}
                value={swatch.hex}
                checked={color === swatch.hex}
                onChange={() => setColor(swatch.hex)}
                className="sr-only"
              />
              <span className="sr-only">{t(`identity.colors.${swatch.id}`)}</span>
              {color === swatch.hex ? (
                <svg aria-hidden="true" viewBox="0 0 16 16" className="size-4 text-ink-fixed" fill="none" stroke="currentColor" strokeWidth="2.4">
                  <path d="M3 8.5l3.2 3L13 4.5" />
                </svg>
              ) : null}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" variant="primary">
          {submitLabel}
        </Button>
        {onCancel ? (
          <Button variant="ghost" onClick={onCancel}>
            {t("identity.cancel")}
          </Button>
        ) : null}
      </div>
    </form>
  );
}
