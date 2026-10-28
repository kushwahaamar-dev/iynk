"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import { Button, cx, Icon, TextInput } from "@/components/ui";
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
        <h3 id={`${id}-title`} className="text-base font-semibold">
          {t("identity.title")}
        </h3>
        <p className="text-sm text-muted">{t("identity.hint")}</p>
      </div>
      <TextInput
        ref={nameRef}
        label={t("identity.name")}
        value={name}
        onChange={(event) => {
          setName(event.target.value);
          if (event.target.value.trim()) setMissing(false);
        }}
        maxLength={MAX_NAME_LENGTH}
        autoComplete="nickname"
        required
        error={missing ? t("identity.missing") : undefined}
      />
      <fieldset className="flex flex-col gap-1">
        <legend className="field-label mb-1">{t("identity.color")}</legend>
        <div className="flex flex-wrap gap-2">
          {PEER_COLORS.map((swatch) => {
            const picked = color === swatch.hex;
            return (
              <button
                key={swatch.id}
                type="button"
                aria-pressed={picked}
                aria-label={t(`identity.colors.${swatch.id}`)}
                onClick={() => setColor(swatch.hex)}
                className={cx(
                  "inline-flex size-10 items-center justify-center rounded-lg text-ink-fixed motion-fade enabled:active:scale-98 enabled:active:motion-press [@media(pointer:coarse)]:size-11",
                  picked && "outline-2 outline-offset-2 outline-ink",
                )}
                style={{ backgroundColor: swatch.hex }}
              >
                {picked ? <Icon name="check" size={20} /> : null}
              </button>
            );
          })}
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
