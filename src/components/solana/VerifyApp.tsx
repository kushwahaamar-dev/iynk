"use client";

import { PublicKey } from "@solana/web3.js";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useId, useState, type FormEvent, type ReactNode } from "react";
import { Action, ActionLink, Note, Section, eyebrow } from "@/components/editorial/Editorial";
import { Callout, Icon } from "@/components/ui";
import { useLocale } from "@/i18n/client";
import { reloadFeatures, useFeatures } from "@/lib/features";
import { PROGRAM_ID, explorerUrl, isAddress, shortAddress } from "@/lib/solana/config";
import { SolanaProvider } from "@/lib/solana/provider";
import { CredentialCard } from "./CredentialCard";
import { useSolanaT } from "./SolanaText";
import { useConfigIssuer, useCredentialAt, useCredentialsOf, type ChainRead } from "./useChain";

function valid(value: string | null): string | null {
  return value && isAddress(value) ? value : null;
}

function Results({ learner, credential }: { learner: string | null; credential: string | null }) {
  const t = useSolanaT();
  const [retry, setRetry] = useState(0);
  const issuer = useConfigIssuer();
  const many = useCredentialsOf(credential ? null : learner, retry);
  const one = useCredentialAt(credential, retry);
  const read: ChainRead<unknown> = credential ? one : many;

  if (!learner && !credential) return <p className="max-w-[60ch] text-muted">{t("verify.empty")}</p>;
  if (read.status === "loading" || read.status === "idle") return <p className="text-muted" aria-busy="true">{t("passport.reading")}</p>;
  if (read.status === "error")
    return (
      <Callout tone="warn">
        <p>{t("passport.readError")}</p>
        <Action size="sm" kind="secondary" className="mt-2" onClick={() => setRetry((n) => n + 1)}>
          {t("retry")}
        </Action>
      </Callout>
    );
  if (credential) {
    if (one.status !== "ready" || !one.data) return <Note>{t("verify.noCredential")}</Note>;
    return <CredentialCard credential={one.data} issuer={issuer} />;
  }
  if (many.status !== "ready" || many.data.length === 0) return <Note>{t("verify.noneForLearner")}</Note>;
  return (
    <div className="grid gap-6">
      <h2 className={eyebrow}>{t("verify.resultsFor", { address: shortAddress(learner as string) })}</h2>
      <ul className="grid gap-6 xl:grid-cols-2">
        {many.data.map((c) => (
          <li key={c.address}>
            <CredentialCard credential={c} issuer={issuer} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function Verify() {
  const t = useSolanaT();
  const { status, features } = useFeatures();
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const ids = useId();
  const learner = valid(params.get("learner"));
  const credential = valid(params.get("credential"));
  const [query, setQuery] = useState(credential ?? learner ?? "");
  const [invalid, setInvalid] = useState(false);

  if (status === "loading") return <div className="mt-[clamp(48px,6vw,96px)] h-40 animate-pulse border-t border-rule bg-sunken/50 motion-reduce:animate-none" aria-busy="true" />;
  if (status === "error")
    return (
      <div className="mt-[clamp(48px,6vw,96px)]">
        <Callout tone="warn">
          <p>{t("statusError")}</p>
          <Action size="sm" kind="secondary" className="mt-2" onClick={reloadFeatures}>
            {t("retry")}
          </Action>
        </Callout>
      </div>
    );
  if (!features.solana || !PROGRAM_ID) return <NotSetUp />;

  function submit(event: FormEvent) {
    event.preventDefault();
    const value = query.trim();
    if (!isAddress(value)) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    // Wallets are ed25519 keys; credential accounts are program addresses, off the curve.
    const key = PublicKey.isOnCurve(new PublicKey(value).toBytes()) ? "learner" : "credential";
    router.replace(`${pathname}?${key}=${value}`, { scroll: false });
  }

  const results: ReactNode = <Results learner={learner} credential={credential} />;

  return (
    <>
      <div className="mt-[clamp(48px,6vw,96px)] grid grid-cols-1 gap-10 border-t border-rule pt-8 lg:grid-cols-12 lg:gap-x-6">
        <form onSubmit={submit} noValidate className="grid gap-3 lg:col-span-7">
          <label htmlFor={`${ids}-q`} className={eyebrow}>
            {t("verify.inputLabel")}
          </label>
          <div className="flex flex-wrap gap-3">
            <input
              id={`${ids}-q`}
              className="ink-field min-h-13 min-w-0 flex-1 basis-64 px-5 font-ui text-sm font-normal"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoComplete="off"
              spellCheck={false}
              aria-invalid={invalid}
              aria-describedby={invalid ? `${ids}-err` : undefined}
            />
            <Action type="submit" kind="primary" size="lg">
              {t("verify.submit")}
            </Action>
          </div>
          {invalid ? (
            <p id={`${ids}-err`} className="text-sm text-bad">
              {t("verify.invalid")}
            </p>
          ) : null}
        </form>
        <div aria-live="polite" className="lg:col-span-12">
          {results}
        </div>
      </div>
      <Section id={`${ids}-how`} index="02" title={t("verify.howTitle")}>
        <p className="max-w-[62ch] text-[17px] leading-[1.6]">{t("verify.how")}</p>
        {PROGRAM_ID ? (
          <dl className="mt-8 border-y border-rule py-4 font-ui text-xs">
            <dt className={eyebrow}>{t("verify.program")}</dt>
            <dd className="mt-1">
              <a
                href={explorerUrl("address", PROGRAM_ID.toBase58())}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center gap-1.5 break-all text-sm"
                translate="no"
              >
                {PROGRAM_ID.toBase58()}
                <Icon name="external" size={14} />
              </a>
            </dd>
          </dl>
        ) : null}
      </Section>
    </>
  );
}

/** /[lang]/verify: anyone checks a credential straight from Solana devnet. */
export function VerifyApp() {
  return (
    <SolanaProvider>
      <Verify />
    </SolanaProvider>
  );
}

/** The page without Solana: say so once and give the way back, so it doesn't end in empty paper. */
function NotSetUp() {
  const t = useSolanaT();
  const lang = useLocale();
  return (
    <div className="mt-[clamp(48px,6vw,96px)] border-t border-rule pt-8">
      <Note
        title={t("notSetUp.title")}
        action={
          <ActionLink href={`/${lang}`} kind="secondary" size="lg">
            {t("notSetUp.back")}
          </ActionLink>
        }
      >
        {t("notSetUp.body")}
      </Note>
    </div>
  );
}
