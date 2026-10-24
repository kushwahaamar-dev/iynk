"use client";

import Link from "next/link";
import { Card, Chip, Icon } from "@/components/ui";
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
 * known, so the card can say whether SimLab signed it.
 */
export function CredentialCard({ credential, issuer }: { credential: Credential; issuer?: string | null }) {
  const t = useSolanaT();
  const locale = useLocale();
  const skill = parseSkillId(credential.skillId);
  const date = new Intl.DateTimeFormat(htmlLang(locale), { dateStyle: "medium", timeStyle: "short" }).format(new Date(credential.issuedAt * 1000));
  const titleId = `cred-${credential.address}`;

  return (
    <Card as="article" padding="none" aria-labelledby={titleId} className="overflow-hidden">
      <div className={`h-3 border-b-2 border-line ${skill ? BAND[skill.lab] : "bg-blush"}`} aria-hidden="true" />
      <div className="grid gap-3 p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h3 id={titleId} className="text-lg">
            {skillTitle(t, credential.skillId)}
          </h3>
          <Chip tone="ink">
            {t("credential.score")} {t("panel.scoreValue", { score: credential.score })}
          </Chip>
        </div>
        <p className="font-ui text-xs text-muted">{t("credential.issued", { date })}</p>
        <dl className="grid gap-2 font-ui text-xs">
          <div>
            <dt className="text-muted">{t("credential.learner")}</dt>
            <dd translate="no">{shortAddress(credential.learner)}</dd>
          </div>
          <div>
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
          <div>
            <dt className="text-muted">{t("credential.replayHash")}</dt>
            <dd className="break-all" translate="no">
              {credential.replayHash}
            </dd>
          </div>
          <div>
            <dt className="text-muted">{t("credential.account")}</dt>
            <dd className="break-all" translate="no">
              {credential.address}
            </dd>
          </div>
        </dl>
        <p className="text-xs text-muted">{t("credential.soulbound")}</p>
        <div className="flex flex-wrap gap-x-4 font-ui text-sm font-bold">
          <a href={explorerUrl("address", credential.address)} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-1">
            {t("credential.explorer")}
            <Icon name="external" size={16} />
          </a>
          <Link href={`/${locale}/verify?credential=${credential.address}`} className="inline-flex min-h-11 items-center gap-1">
            {t("credential.verifyLink")}
            <Icon name="chevron-right" size={16} />
          </Link>
        </div>
      </div>
    </Card>
  );
}
