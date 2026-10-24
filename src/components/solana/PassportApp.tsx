"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Button, Callout, Card, Icon } from "@/components/ui";
import { useLocale } from "@/i18n/client";
import { reloadFeatures, useFeatures } from "@/lib/features";
import { PROGRAM_ID } from "@/lib/solana/config";
import { SolanaProvider } from "@/lib/solana/provider";
import { BountyForm } from "./BountyForm";
import { CredentialCard } from "./CredentialCard";
import { useSolanaT } from "./SolanaText";
import { SponsoredBounties } from "./SponsoredBounties";
import { WalletBar } from "./WalletBar";
import { useConfigIssuer, useCredentialsOf } from "./useChain";

function Credentials() {
  const t = useSolanaT();
  const locale = useLocale();
  const { publicKey } = useWallet();
  const [retry, setRetry] = useState(0);
  const issuer = useConfigIssuer();
  const read = useCredentialsOf(publicKey?.toBase58() ?? null, retry);

  let body: ReactNode;
  if (read.status === "idle") body = <p className="text-muted">{t("passport.connectFirst")}</p>;
  else if (read.status === "loading") body = <p className="text-muted" aria-busy="true">{t("passport.reading")}</p>;
  else if (read.status === "error")
    body = (
      <Callout tone="warn">
        <p>{t("passport.readError")}</p>
        <Button size="sm" variant="secondary" className="mt-2" onClick={() => setRetry((n) => n + 1)}>
          {t("retry")}
        </Button>
      </Callout>
    );
  else if (read.data.length === 0)
    body = (
      <Card tone="sunken" className="grid gap-3">
        <p>{t("passport.credentialsEmpty")}</p>
        <Link href={`/${locale}/drones`} className="inline-flex min-h-11 items-center gap-1 font-ui text-sm font-bold">
          {t("passport.goDrones")}
          <Icon name="chevron-right" size={16} />
        </Link>
      </Card>
    );
  else
    body = (
      <ul className="grid gap-4 md:grid-cols-2">
        {read.data.map((credential) => (
          <li key={credential.address}>
            <CredentialCard credential={credential} issuer={issuer} />
          </li>
        ))}
      </ul>
    );

  return (
    <section aria-labelledby="passport-credentials" className="grid gap-4">
      <h2 id="passport-credentials">{t("passport.credentialsTitle")}</h2>
      <div aria-live="polite">{body}</div>
    </section>
  );
}

function Bounties() {
  const t = useSolanaT();
  const [created, setCreated] = useState(0);
  return (
    <section aria-labelledby="passport-bounties" className="grid gap-4">
      <h2 id="passport-bounties">{t("bounties.formTitle")}</h2>
      <p className="max-w-2xl">{t("bounties.formLede")}</p>
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <BountyForm onCreated={() => setCreated((n) => n + 1)} />
        </Card>
        <SponsoredBounties refresh={created} />
      </div>
    </section>
  );
}

function Passport() {
  const t = useSolanaT();
  const { status, features } = useFeatures();
  if (status === "loading") return <div className="h-48 animate-pulse rounded-ink bg-sunken" aria-busy="true" />;
  if (status === "error")
    return (
      <Callout tone="warn">
        <p>{t("statusError")}</p>
        <Button size="sm" variant="secondary" className="mt-2" onClick={reloadFeatures}>
          {t("retry")}
        </Button>
      </Callout>
    );
  if (!features.solana || !PROGRAM_ID)
    return (
      <Callout tone="note" title={t("notSetUp.title")}>
        {t("notSetUp.body")}
      </Callout>
    );
  return (
    <div className="grid gap-12">
      <section aria-labelledby="passport-wallet" className="grid gap-4">
        <h2 id="passport-wallet">{t("wallet.title")}</h2>
        <Card className="max-w-xl">
          <WalletBar />
        </Card>
      </section>
      <Credentials />
      <Bounties />
    </div>
  );
}

/** /[lang]/passport: your wallet, your credentials and the bounties you sponsor. */
export function PassportApp() {
  return (
    <SolanaProvider>
      <Passport />
    </SolanaProvider>
  );
}
