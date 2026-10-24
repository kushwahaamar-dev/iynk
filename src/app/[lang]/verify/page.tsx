import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { SolanaTextProvider } from "@/components/solana/SolanaText";
import { VerifyApp } from "@/components/solana/VerifyApp";
import { isLocale } from "@/i18n/config";
import { alternatesFor } from "@/i18n/seo";
import { loadSolanaMessages, solanaTranslator } from "@/lib/solana/messages";

type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const t = solanaTranslator(lang, await loadSolanaMessages(lang));
  return { title: t("verify.metaTitle"), description: t("verify.metaDescription"), alternates: alternatesFor(lang, "/verify") };
}

export default function VerifyPage({ params }: Props) {
  return (
    <Suspense fallback={<div className="mx-auto min-h-[70vh] max-w-5xl px-4 sm:px-6" aria-busy="true" />}>
      <Verify params={params} />
    </Suspense>
  );
}

async function Verify({ params }: Props) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const messages = await loadSolanaMessages(lang);
  const t = solanaTranslator(lang, messages);

  return (
    <div className="mx-auto max-w-5xl px-4 pb-16 pt-8 sm:px-6 sm:pt-12">
      <header className="mb-10">
        <p className="ink-kicker">{t("verify.kicker")}</p>
        <h1 className="mt-3">{t("verify.title")}</h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed">{t("verify.lede")}</p>
      </header>
      <SolanaTextProvider locale={lang} messages={messages}>
        {/* ?learner= and ?credential= are read on the client, so the page stays static. */}
        <Suspense fallback={<div className="min-h-40" aria-busy="true" />}>
          <VerifyApp />
        </Suspense>
      </SolanaTextProvider>
    </div>
  );
}
