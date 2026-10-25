import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageHead, page } from "@/components/editorial/Editorial";
import { SolanaTextProvider } from "@/components/solana/SolanaText";
import { VerifyApp } from "@/components/solana/VerifyApp";
import { cx } from "@/components/ui/cx";
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
    <Suspense fallback={<div className={cx(page, "min-h-[70vh]")} aria-busy="true" />}>
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
    <div className={cx(page, "pb-[clamp(72px,10vw,160px)]")}>
      <PageHead label={t("verify.kicker")} title={t("verify.title")} lede={<p>{t("verify.lede")}</p>} />
      <SolanaTextProvider locale={lang} messages={messages}>
        {/* ?learner= and ?credential= are read on the client, so the page stays static. */}
        <Suspense fallback={<div className="min-h-40" aria-busy="true" />}>
          <VerifyApp />
        </Suspense>
      </SolanaTextProvider>
    </div>
  );
}
