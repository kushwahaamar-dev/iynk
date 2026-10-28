"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/Field";
import { Icon } from "@/components/ui/icons";
import { useCommonT } from "@/i18n/client";
import { removeKey, setKey, useKeys, type KeyKind, type SetKeyResult } from "@/lib/keys";

type Problem = Extract<SetKeyResult, { ok: false }>["reason"];

const PROBLEM_MESSAGE = {
  empty: "keys.errors.empty",
  too_long: "keys.errors.tooLong",
  bad_chars: "keys.errors.badChars",
  storage: "keys.errors.notPersisted",
} as const satisfies Record<Problem, string>;

const LABELS = { ai: "keys.ai.label", search: "keys.search.label", server: "keys.server.label" } as const;

function KeyField({ kind }: { kind: KeyKind }) {
  const t = useCommonT();
  const masked = useKeys()[kind];
  const id = useId();
  const [draft, setDraft] = useState("");
  const [name, setName] = useState("");
  const [problem, setProblem] = useState<Problem | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const removeButton = useRef<HTMLButtonElement>(null);
  const moveFocus = useRef(false);

  // Saving or removing swaps the controls, so the focused button disappears: hand focus to the one that replaces it.
  useEffect(() => {
    if (!moveFocus.current) return;
    moveFocus.current = false;
    (masked.set ? removeButton : input).current?.focus();
  }, [masked.set]);

  const label = t(LABELS[kind]);
  const hint = kind === "server" ? t("keys.server.hint") : undefined;

  function save(event: FormEvent) {
    event.preventDefault();
    const result = setKey(kind, draft, kind === "ai" ? name : undefined);
    if (!result.ok) {
      setProblem(result.reason);
      return;
    }
    setProblem(null);
    setDraft("");
    setName("");
    moveFocus.current = true;
  }

  if (masked.set) {
    return (
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="ink-label">{label}</div>
          <p className="flex items-center gap-2 text-sm font-semibold">
            <Icon name="check" size={16} className="shrink-0 text-good" aria-hidden="true" />
            <span className="min-w-0 break-words tabular-nums">
              {t("keys.saved", { tail: masked.tail })}
              {masked.label ? <span className="font-normal text-muted"> ({masked.label})</span> : null}
            </span>
          </p>
          {masked.persisted ? null : <p className="mt-1 text-sm text-muted">{t("keys.errors.notPersisted")}</p>}
        </div>
        <Button
          ref={removeButton}
          size="sm"
          variant="secondary"
          aria-label={`${t("keys.remove")}: ${label}`}
          onClick={() => {
            moveFocus.current = true;
            removeKey(kind);
          }}
        >
          {t("keys.remove")}
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-2" noValidate>
      <div className="flex items-end gap-2">
        <div className="min-w-0 flex-1">
          <TextInput
            ref={input}
            label={label}
            type="password"
            autoComplete="off"
            spellCheck={false}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            aria-invalid={problem !== null}
            aria-describedby={`${id}-note`}
          />
        </div>
        <Button type="submit" size="md" variant="primary" aria-label={`${t("keys.save")}: ${label}`}>
          {t("keys.save")}
        </Button>
      </div>
      <div id={`${id}-note`} className="empty:hidden">
        {problem ? (
          <p role="alert" className="text-sm text-bad">
            {t(PROBLEM_MESSAGE[problem])}
          </p>
        ) : hint ? (
          <p className="text-sm text-muted">{hint}</p>
        ) : null}
      </div>
      {kind === "ai" ? (
        <TextInput label={t("keys.ai.labelOptional")} autoComplete="off" maxLength={40} value={name} onChange={(event) => setName(event.target.value)} />
      ) : null}
    </form>
  );
}

/** The three key slots: AI, search and the server token. The secrets stay in this browser. */
export function KeysPanel() {
  const t = useCommonT();
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted">{t("keys.notice")}</p>
      <KeyField kind="ai" />
      <KeyField kind="search" />
      <KeyField kind="server" />
    </div>
  );
}
