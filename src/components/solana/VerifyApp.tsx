"use client";

import { PublicKey } from "@solana/web3.js";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useId, useState, type FormEvent, type ReactNode } from "react";
import { Button, Callout, Card, Icon } from "@/components/ui";
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

  if (!learner && !credential) return <p className="text-muted">{t("verify.empty")}</p>;
  if (read.status === "loading" || read.status === "idle") return <p className="text-muted" aria-busy="true">{t("passport.reading")}</p>;
  if (read.status === "error")
    return (
      <Callout tone="warn">
        <p>{t("passport.readError")}</p>
        <Button size="sm" variant="secondary" className="mt-2" onClick={() => setRetry((n) => n + 1)}>
          {t("retry")}
        </Button>
      </Callout>
    );
  if (credential) {
    if (one.status !== "ready" || !one.data) return <p>{t("verify.noCredential")}</p>;
    return <CredentialCard credential={one.data} issuer={issuer} />;
  }
  if (many.status !== "ready" || many.data.length === 0) return <p>{t("verify.noneForLearner")}</p>;
  return (
    <div className="grid gap-4">
      <h2 className="text-xl">{t("verify.resultsFor", { address: shortAddress(learner as string) })}</h2>
      <ul className="grid gap-4 md:grid-cols-2">
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
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const ids = useId();
  const learner = valid(params.get("learner"));
  const credential = valid(params.get("credential"));
  const [query, setQuery] = useState(credential ?? learner ?? "");
  const [invalid, setInvalid] = useState(false);

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

  let results: ReactNode;
  if (!PROGRAM_ID) {
    results = (
      <Callout tone="note" title={t("notSetUp.title")}>
        {t("notSetUp.body")}
      </Callout>
    );
  } else {
    results = <Results learner={learner} credential={credential} />;
  }

  return (
    <div className="grid gap-8">
      <form onSubmit={submit} noValidate className="grid max-w-xl gap-2">
        <label htmlFor={`${ids}-q`} className="font-ui text-sm font-bold">
          {t("verify.inputLabel")}
        </label>
        <div className="flex flex-wrap gap-2">
          <input
            id={`${ids}-q`}
            className="ink-field min-w-0 flex-1"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoComplete="off"
            spellCheck={false}
            aria-invalid={invalid}
            aria-describedby={invalid ? `${ids}-err` : undefined}
          />
          <Button type="submit" variant="primary">
            {t("verify.submit")}
          </Button>
        </div>
        {invalid ? (
          <p id={`${ids}-err`} className="text-sm text-bad">
            {t("verify.invalid")}
          </p>
        ) : null}
      </form>
      <div aria-live="polite">{results}</div>
      <Card tone="sunken" className="grid gap-2">
        <h2 className="text-lg">{t("verify.howTitle")}</h2>
        <p className="text-sm">{t("verify.how")}</p>
        {PROGRAM_ID ? (
          <p className="font-ui text-xs">
            <span className="text-muted">{t("verify.program")}: </span>
            <a href={explorerUrl("address", PROGRAM_ID.toBase58())} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-1 break-all font-bold">
              {PROGRAM_ID.toBase58()}
              <Icon name="external" size={14} />
            </a>
          </p>
        ) : null}
      </Card>
    </div>
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
