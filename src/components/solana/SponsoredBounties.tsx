"use client";

import { PublicKey } from "@solana/web3.js";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useEffect, useState } from "react";
import { Button, Callout, Chip } from "@/components/ui";
import { useLocale } from "@/i18n/client";
import { cancelBounty } from "@/lib/solana/actions";
import { PROGRAM_ID, shortAddress } from "@/lib/solana/config";
import type { Bounty } from "@/lib/solana/passport";
import { bountiesBySponsor } from "@/lib/solana/reads";
import { useSolanaT } from "./SolanaText";
import { bumpBalances } from "./WalletBar";
import { formatSol, walletErrorText } from "./shared";

type Loaded = { owner: string; bounties: Bounty[] } | { owner: string; error: true };

/** The connected wallet's bounties: open ones can be cancelled for a refund. */
export function SponsoredBounties({ refresh = 0 }: { refresh?: number }) {
  const t = useSolanaT();
  const locale = useLocale();
  const { connection } = useConnection();
  const wallet = useWallet();
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [reload, setReload] = useState(0);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  const owner = wallet.publicKey?.toBase58() ?? null;

  useEffect(() => {
    if (!PROGRAM_ID || !owner) return;
    let live = true;
    bountiesBySponsor(connection, PROGRAM_ID, new PublicKey(owner)).then(
      (bounties) => live && setLoaded({ owner, bounties }),
      () => live && setLoaded({ owner, error: true }),
    );
    return () => {
      live = false;
    };
  }, [connection, owner, refresh, reload]);

  if (!PROGRAM_ID || !owner) return null;
  const programId = PROGRAM_ID;
  const current = loaded?.owner === owner ? loaded : null;

  async function cancel(bounty: Bounty) {
    setCancelling(bounty.address);
    setMessage(null);
    try {
      await cancelBounty(connection, wallet, programId, new PublicKey(bounty.address));
      setMessage({ tone: "success", text: t("bounties.cancelled") });
      bumpBalances();
      setReload((n) => n + 1);
    } catch (error) {
      setMessage({ tone: "danger", text: walletErrorText(t, error) });
    } finally {
      setCancelling(null);
    }
  }

  return (
    <section aria-labelledby="sponsored-title" className="grid gap-3">
      <h3 id="sponsored-title" className="text-lg">
        {t("bounties.mineTitle")}
      </h3>
      {!current ? (
        <p className="text-sm text-muted" aria-busy="true">
          {t("passport.reading")}
        </p>
      ) : "error" in current ? (
        <Callout tone="warn">
          <p>{t("bounties.readError")}</p>
          <Button size="sm" variant="secondary" className="mt-2" onClick={() => setReload((n) => n + 1)}>
            {t("retry")}
          </Button>
        </Callout>
      ) : current.bounties.length === 0 ? (
        <p className="text-sm text-muted">{t("bounties.mineEmpty")}</p>
      ) : (
        <ul className="grid gap-2">
          {current.bounties.map((b) => (
            <li key={b.address} className="ink-card flex flex-wrap items-center gap-2 p-3 font-ui text-sm">
              <Chip tone={b.claimedBy ? "mint" : "mustard"}>{t("sol", { amount: formatSol(b.lamports, locale) })}</Chip>
              <code className="text-xs" translate="no">
                {b.skillId}
              </code>
              <span className="flex-1 text-muted">
                {b.claimedBy ? t("bounties.paidTo", { address: shortAddress(b.claimedBy) }) : b.learner ? shortAddress(b.learner) : t("bounties.anyone")}
              </span>
              {b.claimedBy ? null : (
                <Button size="sm" variant="ghost" onClick={() => cancel(b)} disabled={cancelling !== null} aria-busy={cancelling === b.address}>
                  {cancelling === b.address ? t("bounties.cancelling") : t("bounties.cancelBounty")}
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
      {message ? (
        <Callout tone={message.tone} live>
          {message.text}
        </Callout>
      ) : null}
    </section>
  );
}
