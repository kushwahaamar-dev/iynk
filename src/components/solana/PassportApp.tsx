"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Action, ActionLink, Note, Section } from "@/components/editorial/Editorial";
import { Callout, Icon } from "@/components/ui";
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
        <Action size="sm" kind="secondary" className="mt-2" onClick={() => setRetry((n) => n + 1)}>
          {t("retry")}
        </Action>
      </Callout>
    );
  else if (read.data.length === 0)
    body = (
      <Note
        action={
          <Link href={`/${locale}/drones`} className="inline-flex min-h-11 items-center gap-1 font-body text-sm font-semibold">
            {t("passport.goDrones")}
            <Icon name="chevron-right" size={16} />
          </Link>
        }
      >
        {t("passport.credentialsEmpty")}
      </Note>
    );
  else
    body = (
      <ul className="grid gap-6 xl:grid-cols-2">
        {read.data.map((credential) => (
          <li key={credential.address}>
            <CredentialCard credential={credential} issuer={issuer} />
          </li>
        ))}
      </ul>
    );

  return (
    <Section id="passport-credentials" index="02" title={t("passport.credentialsTitle")}>
      <div aria-live="polite">{body}</div>
    </Section>
  );
}

function Bounties() {
  const t = useSolanaT();
  const [created, setCreated] = useState(0);
  return (
    <Section id="passport-bounties" index="03" title={t("bounties.formTitle")} lede={<p>{t("bounties.formLede")}</p>}>
      <div className="grid gap-x-10 gap-y-12 xl:grid-cols-2">
        <BountyForm onCreated={() => setCreated((n) => n + 1)} />
        <div className="border-t border-rule pt-6 xl:border-t-0 xl:border-s xl:ps-10 xl:pt-0">
          <SponsoredBounties refresh={created} />
        </div>
      </div>
    </Section>
  );
}

function Passport() {
  const t = useSolanaT();
  const { status, features } = useFeatures();
  if (status === "loading") return <div className="mt-[clamp(72px,10vw,160px)] h-48 animate-pulse border-t border-rule bg-sunken/50 motion-reduce:animate-none" aria-busy="true" />;
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
  return (
    <>
      <Section id="passport-wallet" index="01" title={t("wallet.title")}>
        <div className="max-w-xl">
          <WalletBar />
        </div>
      </Section>
      <Credentials />
      <Bounties />
    </>
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
