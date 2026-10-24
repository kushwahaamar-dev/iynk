"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import type { CliSnippet, DroneContent } from "@/content/schema";
import { Button } from "@/components/ui/Button";
import { CodeBlock } from "@/components/ui/CodeBlock";
import type { CodeLang } from "@/components/ui/highlight";
import { unsavedCount, type CliLine } from "@/lib/dronelab/cli";
import type { DroneLabAction, DroneLabState } from "@/lib/dronelab/store";
import type { ContentT, DroneLabT } from "./text";

const CODE_LANG: Record<DroneContent["firmware"]["emulator"]["kind"], CodeLang> = {
  "betaflight-cli": "cli",
  "inav-cli": "cli",
  mavproxy: "params",
  "cflib-python": "python",
};

const LINE_CLASS: Record<CliLine["kind"], string> = {
  in: "text-[#f2c230]",
  out: "text-[#d8f5e2]",
  ok: "text-[#8af0ae]",
  err: "text-[#ff8f7a]",
};

/**
 * The lines of a snippet the console can run: comments dropped (the firmware has no trailing comments, so
 * "set x = 1  # why" must be sent as "set x = 1"), and only when every line is a command it knows.
 */
export function runnableLines(snippet: CliSnippet, content: DroneContent): string[] | null {
  const emu = content.firmware.emulator;
  const lines = snippet.code
    .split("\n")
    .map((line) => line.replace(/\s+#.*$/, "").trim())
    .filter((line) => line && !line.startsWith("#"));
  if (lines.length === 0) return null;
  const known = (line: string) =>
    emu.kind === "cflib-python"
      ? /^(print\()?cf\.param\.(set|get)_value\(/.test(line)
      : emu.commands.includes(line.split(/\s+/)[0].toLowerCase());
  return lines.every(known) ? lines : null;
}

function snippetMode(snippet: CliSnippet, content: DroneContent, t: DroneLabT, ct: ContentT): string {
  if (snippet.mode === "build") return t("cli.snippetBuild");
  const mode = content.flight.modes.find((m) => m.id === snippet.mode);
  return t("cli.snippetMode", { mode: mode ? ct(mode.title) : snippet.mode });
}

type Props = {
  content: DroneContent;
  cli: DroneLabState["cli"];
  t: DroneLabT;
  ct: ContentT;
  dispatch(action: DroneLabAction): void;
};

export function CliConsole({ content, cli, t, ct, dispatch }: Props) {
  const base = useId();
  const { firmware } = content;
  const [draft, setDraft] = useState("");
  const [recall, setRecall] = useState<number | null>(null);
  const screen = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const unsaved = unsavedCount(cli.session);
  const showUnsaved = firmware.emulator.kind === "betaflight-cli" || firmware.emulator.kind === "inav-cli";

  useEffect(() => {
    const el = screen.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [cli.lines.length]);

  function run(line: string) {
    dispatch({ type: "cli/run", line });
    setDraft("");
    setRecall(null);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      run(draft);
    } else if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      if (cli.history.length === 0) return;
      event.preventDefault();
      const last = cli.history.length - 1;
      const next =
        event.key === "ArrowUp"
          ? recall === null
            ? last
            : Math.max(0, recall - 1)
          : recall === null
            ? null
            : recall + 1 > last
              ? null
              : recall + 1;
      setRecall(next);
      setDraft(next === null ? "" : cli.history[next]);
    }
  }

  const fwName = t(`firmware.${firmware.firmware}`);

  return (
    <div className="space-y-4">
      <h2 className="text-xl">{t("cli.title", { cli: firmware.cliName })}</h2>
      <p className="text-muted">{t("cli.lede", { firmware: fwName })}</p>
      <div className="overflow-hidden rounded-ink border-2 border-line shadow-ink">
        <div
          ref={screen}
          role="log"
          aria-label={t("cli.output")}
          aria-live="polite"
          tabIndex={0}
          className="h-72 overflow-y-auto bg-[#1d2a26] p-3 font-ui text-[0.8rem] leading-relaxed"
          data-testid="cli-output"
        >
          {cli.lines.map((line, i) => (
            <div key={i} className={`whitespace-pre-wrap break-words ${LINE_CLASS[line.kind]}`}>
              {line.text}
            </div>
          ))}
        </div>
        <form
          className="flex items-center gap-2 border-t-2 border-line bg-[#14201c] p-2"
          onSubmit={(e) => {
            e.preventDefault();
            run(draft);
          }}
        >
          <label htmlFor={`${base}-cmd`} className="sr-only">
            {t("cli.input")}
          </label>
          <span aria-hidden="true" className="font-ui text-sm text-[#f2c230]">
            {firmware.emulator.prompt.trim() || ">"}
          </span>
          <input
            ref={input}
            id={`${base}-cmd`}
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              setRecall(null);
            }}
            onKeyDown={onKeyDown}
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            aria-describedby={`${base}-hint`}
            className="min-h-11 min-w-0 flex-1 bg-transparent font-ui text-sm text-[#d8f5e2] outline-none placeholder:text-[#8aa59a]"
            data-testid="cli-input"
          />
          <Button type="submit" size="sm" variant="primary">
            {t("cli.send")}
          </Button>
          <Button size="sm" variant="secondary" onClick={() => dispatch({ type: "cli/clear" })}>
            {t("cli.clear")}
          </Button>
        </form>
      </div>
      <p id={`${base}-hint`} className="text-xs text-muted">
        {t("cli.history")}
        {showUnsaved && unsaved > 0 ? (
          <span className="ms-2 font-bold text-warn">{t("cli.unsaved", { count: unsaved })}</span>
        ) : null}
      </p>

      {firmware.snippets.length > 0 ? (
        <section aria-labelledby={`${base}-snippets`} className="space-y-4">
          <h3 id={`${base}-snippets`} className="ink-kicker">
            {t("cli.snippets")}
          </h3>
          {firmware.snippets.map((snippet) => {
            const lines = runnableLines(snippet, content);
            return (
              <article key={snippet.id} className="space-y-2">
                <h4 className="text-base">
                  {ct(snippet.title)}{" "}
                  <span className="font-ui text-xs font-normal text-muted">{snippetMode(snippet, content, t, ct)}</span>
                </h4>
                <p className="text-sm">{ct(snippet.explain)}</p>
                <CodeBlock
                  code={snippet.code}
                  lang={CODE_LANG[firmware.emulator.kind]}
                  label={ct(snippet.title)}
                  copyLabel={t("cli.copy")}
                  copiedLabel={t("cli.copied")}
                />
                {lines ? (
                  <Button
                    size="sm"
                    onClick={() => {
                      for (const line of lines) dispatch({ type: "cli/run", line });
                      input.current?.focus();
                    }}
                  >
                    {t("cli.try")}
                  </Button>
                ) : null}
              </article>
            );
          })}
        </section>
      ) : null}
    </div>
  );
}
