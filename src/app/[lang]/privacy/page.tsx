import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageHead, Section, page } from "@/components/editorial/Editorial";
import { PageSkeleton } from "@/components/ui";
import { cx } from "@/components/ui/cx";
import { isLocale } from "@/i18n/config";
import { alternatesFor } from "@/i18n/seo";
import { getT } from "@/i18n/server";

type Props = PageProps<"/[lang]/privacy">;

const SECTIONS = ["stays", "leaves", "never"] as const;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const t = await getT(lang, "shell");
  return { title: t("privacy.metaTitle"), description: t("privacy.metaDescription"), alternates: alternatesFor(lang, "/privacy") };
}

export default function PrivacyPage({ params }: Props) {
  return (
    <Suspense
      fallback={
        <div className={page}>
          <PageSkeleton kind="article" />
        </div>
      }
    >
      <Privacy params={params} />
    </Suspense>
  );
}

async function Privacy({ params }: Pick<Props, "params">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = await getT(lang, "shell");

  return (
    <div className={cx(page, "pb-16 md:pb-24")}>
      <PageHead title={t("privacy.title")} lede={<p>{t("privacy.lede")}</p>} />
      {SECTIONS.map((key) => (
        <Section key={key} id={`privacy-${key}-${lang}`} title={t(`privacy.${key}.title`)}>
          <p className="max-w-prose text-base">{t(`privacy.${key}.text`)}</p>
        </Section>
      ))}
    </div>
  );
}
