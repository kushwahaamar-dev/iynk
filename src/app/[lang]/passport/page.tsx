import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PassportApp } from "@/components/solana/PassportApp";
import { SolanaTextProvider } from "@/components/solana/SolanaText";
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
    <Suspense fallback={<div className="frame min-h-[70vh]" aria-busy="true" />}>
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
    <div className="frame pt-8 sm:pt-12">
      <header className="mb-10">
        <p className="ink-kicker">{t("passport.kicker")}</p>
        <h1 className="mt-3">{t("passport.title")}</h1>
        <p className="mt-5 max-w-[68ch] text-lg leading-relaxed">{t("passport.lede")}</p>
      </header>
      <SolanaTextProvider locale={lang} messages={messages}>
        <PassportApp />
      </SolanaTextProvider>
    </div>
  );
}
