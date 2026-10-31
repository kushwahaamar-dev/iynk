"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useProvidersT } from "@/ai/messages";
import { Button } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/Field";
import { Icon } from "@/components/ui/icons";
import { Skeleton, SkeletonGroup } from "@/components/ui/Skeleton";
import { useCommonT, useLocale } from "@/i18n/client";
import { removeKey, setKey, useKeys, type SetKeyResult } from "@/lib/keys";
import { ProfilesPanel, type ProfilesPanelProps } from "./ProfilesPanel";

type Problem = Extract<SetKeyResult, { ok: false }>["reason"];

const PROBLEM_MESSAGE = {
  empty: "keys.errors.empty",
  too_long: "keys.errors.tooLong",
  bad_chars: "keys.errors.badChars",
  storage: "keys.errors.notPersisted",
} as const satisfies Record<Problem, string>;

function SearchKeyField() {
  const t = useCommonT();
  const masked = useKeys().search;
  const [draft, setDraft] = useState("");
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

  const label = t("keys.search.label");

  function save(event: FormEvent) {
    event.preventDefault();
    const result = setKey("search", draft);
    if (!result.ok) {
      setProblem(result.reason);
      return;
    }
    setProblem(null);
    setDraft("");
    moveFocus.current = true;
  }

  if (masked.set) {
    return (
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="field-label">{label}</div>
          <p className="flex items-center gap-2 text-sm font-semibold">
            <Icon name="check" size={16} className="shrink-0 text-good" aria-hidden="true" />
            <span className="min-w-0 break-words tabular-nums">
              {t("keys.saved", { tail: masked.tail })}
            </span>
          </p>
          {masked.persisted ? null : <p className="mt-1 text-sm text-muted">{t("keys.errors.notPersisted")}</p>}
        </div>
        <Button
          ref={removeButton}
          size="sm"
          variant="ghost"
          aria-label={`${t("keys.remove")}: ${label}`}
          onClick={() => {
            moveFocus.current = true;
            removeKey("search");
          }}
        >
          {t("keys.remove")}
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-2" noValidate>
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <TextInput
            ref={input}
            label={label}
            type="password"
            autoComplete="off"
            spellCheck={false}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            error={problem ? t(PROBLEM_MESSAGE[problem]) : undefined}
          />
        </div>
        <Button type="submit" size="md" variant="primary" className="mt-6" aria-label={`${t("keys.save")}: ${label}`}>
          {t("keys.save")}
        </Button>
      </div>
    </form>
  );
}

/** The AI providers need the browser's stores and the AI worker, which the page that mounts the dialog supplies. */
export type AiServices = Omit<ProfilesPanelProps, "t">;

function Providers({ ai }: { ai: AiServices }) {
  const common = useCommonT();
  const t = useProvidersT(useLocale());
  if (!t) {
    return (
      <SkeletonGroup label={common("state.loading")} className="flex flex-col gap-2">
        <Skeleton className="h-6 w-1/3" />
        <Skeleton className="h-16 w-full" />
      </SkeletonGroup>
    );
  }
  return <ProfilesPanel {...ai} t={t} />;
}

/** The AI providers and the search key. The secrets stay in this browser. */
export function KeysPanel({ ai }: { ai?: AiServices }) {
  const t = useCommonT();
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted">{t("keys.notice")}</p>
      {ai ? <Providers ai={ai} /> : null}
      <SearchKeyField />
    </div>
  );
}
