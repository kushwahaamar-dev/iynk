import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageHead, page } from "@/components/editorial/Editorial";
import { PassportApp } from "@/components/solana/PassportApp";
import { SolanaTextProvider } from "@/components/solana/SolanaText";
import { cx } from "@/components/ui/cx";
import { isLocale } from "@/i18n/config";
import { alternatesFor } from "@/i18n/seo";
import { loadSolanaMessages, solanaTranslator } from "@/lib/solana/messages";

type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const t = solanaTranslator(lang, await loadSolanaMessages(lang));
  return { title: t("passport.metaTitle"), description: t("passport.metaDescription"), alternates: alternatesFor(lang, "/passport") };
}

export default function PassportPage({ params }: Props) {
  return (
    <Suspense fallback={<div className={cx(page, "min-h-[70vh]")} aria-busy="true" />}>
      <Passport params={params} />
    </Suspense>
  );
}

async function Passport({ params }: Props) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const messages = await loadSolanaMessages(lang);
  const t = solanaTranslator(lang, messages);

  return (
    <div className={cx(page, "pb-[clamp(72px,10vw,160px)]")}>
      <PageHead label={t("passport.kicker")} title={t("passport.title")} lede={<p>{t("passport.lede")}</p>} />
      <SolanaTextProvider locale={lang} messages={messages}>
        <PassportApp />
      </SolanaTextProvider>
    </div>
  );
}
