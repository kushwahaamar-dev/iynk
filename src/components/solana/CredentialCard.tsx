"use client";

import Link from "next/link";
import { eyebrow } from "@/components/editorial/Editorial";
import { Chip, Icon } from "@/components/ui";
import { useLocale } from "@/i18n/client";
import { htmlLang } from "@/i18n/config";
import { explorerUrl, shortAddress } from "@/lib/solana/config";
import type { SolanaT } from "@/lib/solana/messages";
import type { Credential } from "@/lib/solana/passport";
import { parseSkillId } from "@/lib/verify/skill";
import { useSolanaT } from "./SolanaText";

export function skillTitle(t: SolanaT, skillId: string): string {
  const skill = parseSkillId(skillId);
  if (!skill) return t("credential.skills.unknown", { id: skillId });
  switch (skill.lab) {
    case "drone":
      return t("credential.skills.drone", { item: skill.itemId });
    case "board":
      return skill.lessonId
        ? t("credential.skills.boardLesson", { item: skill.itemId, lesson: skill.lessonId })
        : t("credential.skills.boardLessons", { item: skill.itemId });
    case "robotics":
      return t("credential.skills.robotics", { item: skill.itemId });
    case "flight":
      return t("credential.skills.flight", { item: skill.course, seconds: skill.seconds });
  }
}

const BAND = { drone: "bg-tomato", board: "bg-cobalt", robotics: "bg-mint", flight: "bg-mustard" } as const;

/**
 * One on-chain credential. `issuer` is the program's configured issuer, when
 * known, so the card can say whether iynk signed it.
 */
export function CredentialCard({ credential, issuer }: { credential: Credential; issuer?: string | null }) {
  const t = useSolanaT();
  const locale = useLocale();
  const skill = parseSkillId(credential.skillId);
  const date = new Intl.DateTimeFormat(htmlLang(locale), { dateStyle: "medium", timeStyle: "short" }).format(new Date(credential.issuedAt * 1000));
  const titleId = `cred-${credential.address}`;

  return (
    <article aria-labelledby={titleId} className="flex h-full flex-col overflow-hidden rounded-[4px] border border-rule bg-surface">
      <div className={`h-1 ${skill ? BAND[skill.lab] : "bg-blush"}`} aria-hidden="true" />
      <div className="grid gap-6 p-5 sm:p-7">
        <header className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
          <div className="min-w-0 flex-1 basis-56">
            <p className={eyebrow}>{t("credential.issued", { date })}</p>
            <h3 id={titleId} className="mt-3 text-[clamp(22px,2.2vw,28px)] leading-tight font-medium tracking-[-0.02em]">
              {skillTitle(t, credential.skillId)}
            </h3>
          </div>
          <p className="text-end">
            <span className={eyebrow}>{t("credential.score")}</span>
            <span className="mt-1 block font-ui text-3xl leading-none tabular">{t("panel.scoreValue", { score: credential.score })}</span>
          </p>
        </header>
        <dl className="border-t border-rule font-ui text-xs">
          <div className="grid gap-1 border-b border-rule py-3 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-4">
            <dt className="text-muted">{t("credential.learner")}</dt>
            <dd translate="no">{shortAddress(credential.learner)}</dd>
          </div>
          <div className="grid gap-1 border-b border-rule py-3 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-4">
            <dt className="text-muted">{t("credential.issuer")}</dt>
            <dd className="flex flex-wrap items-center gap-2">
              <span translate="no">{shortAddress(credential.issuer)}</span>
              {issuer ? (
                <Chip tone={issuer === credential.issuer ? "mint" : "tomato"} dot>
                  {issuer === credential.issuer ? t("credential.issuerOk") : t("credential.issuerOther")}
                </Chip>
              ) : null}
            </dd>
          </div>
          <div className="grid gap-1 border-b border-rule py-3 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-4">
            <dt className="text-muted">{t("credential.replayHash")}</dt>
            <dd className="break-all" translate="no">
              {credential.replayHash}
            </dd>
          </div>
          <div className="grid gap-1 border-b border-rule py-3 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-4">
            <dt className="text-muted">{t("credential.account")}</dt>
            <dd className="break-all" translate="no">
              {credential.address}
            </dd>
          </div>
        </dl>
        <p className="text-sm text-muted">{t("credential.soulbound")}</p>
        <div className="-my-2 flex flex-wrap gap-x-6 font-body text-sm font-semibold">
          <a href={explorerUrl("address", credential.address)} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-1.5">
            {t("credential.explorer")}
            <Icon name="external" size={16} />
          </a>
          <Link href={`/${locale}/verify?credential=${credential.address}`} className="inline-flex min-h-11 items-center gap-1.5">
            {t("credential.verifyLink")}
            <Icon name="chevron-right" size={16} />
          </Link>
        </div>
      </div>
    </article>
  );
}
