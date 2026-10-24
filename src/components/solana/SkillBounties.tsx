"use client";

import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useEffect, useState } from "react";
import { Chip } from "@/components/ui";
import { useLocale } from "@/i18n/client";
import { PROGRAM_ID, shortAddress } from "@/lib/solana/config";
import type { Bounty } from "@/lib/solana/passport";
import { bountiesForSkill, claimableBy } from "@/lib/solana/reads";
import { skillHash } from "@/lib/verify/skill";
import { useSolanaT } from "./SolanaText";
import { formatSol } from "./shared";

type Loaded = { skillId: string; bounties: Bounty[] } | { skillId: string; error: true };

/** The open sponsor bounties a learner could collect by earning this skill. */
export function SkillBounties({ skillId, refresh = 0 }: { skillId: string; refresh?: number }) {
  const t = useSolanaT();
  const locale = useLocale();
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const [loaded, setLoaded] = useState<Loaded | null>(null);

  useEffect(() => {
    if (!PROGRAM_ID) return;
    let live = true;
    const programId = PROGRAM_ID;
    skillHash(skillId)
      .then((hash) => bountiesForSkill(connection, programId, hash))
      .then(
        (bounties) => live && setLoaded({ skillId, bounties }),
        () => live && setLoaded({ skillId, error: true }),
      );
    return () => {
      live = false;
    };
  }, [connection, skillId, refresh]);

  if (!PROGRAM_ID) return null;
  const me = publicKey?.toBase58() ?? null;
  const current = loaded?.skillId === skillId ? loaded : null;
  const open = current && "bounties" in current ? current.bounties.filter((b) => (me ? claimableBy(b, me) : b.claimedBy === null && b.learner === null)) : [];

  return (
    <section aria-labelledby={`bounties-${skillId}`} className="grid gap-2">
      <h3 id={`bounties-${skillId}`} className="font-ui text-sm font-bold">
        {t("bounties.openTitle")}
      </h3>
      {!current ? (
        <p className="text-sm text-muted" aria-busy="true">
          {t("loading")}
        </p>
      ) : "error" in current ? (
        <p className="text-sm text-bad">{t("bounties.readError")}</p>
      ) : open.length === 0 ? (
        <p className="text-sm text-muted">{t("bounties.none")}</p>
      ) : (
        <ul className="grid gap-2">
          {open.map((b) => (
            <li key={b.address} className="flex flex-wrap items-center gap-2 font-ui text-sm">
              <Chip tone="mint">{t("sol", { amount: formatSol(b.lamports, locale) })}</Chip>
              <span>{b.learner ? t("bounties.forYou") : t("bounties.anyone")}</span>
              <span className="text-muted" translate="no">
                {shortAddress(b.sponsor)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
