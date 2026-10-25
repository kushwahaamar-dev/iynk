import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { TogetherStrings } from "@/components/realtime/messages";
import { createTranslator } from "@/i18n/translate";
import { isLocale } from "@/i18n/config";
import { alternatesFor } from "@/i18n/seo";
import { Lobby } from "./Lobby";
import { getLobbyItems, getTogetherMessages } from "./strings";

type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const t = createTranslator(lang, await getTogetherMessages(lang), `${lang}/together`);
  return { title: t("lobby.metaTitle"), description: t("lobby.metaDescription"), alternates: alternatesFor(lang, "/together") };
}

export default function TogetherPage({ params }: Props) {
  return (
    <Suspense fallback={<div className="frame min-h-[70vh]" aria-busy="true" />}>
      <TogetherLobby params={params} />
    </Suspense>
  );
}

async function TogetherLobby({ params }: Props) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const [messages, items] = await Promise.all([getTogetherMessages(lang), getLobbyItems(lang)]);
  const t = createTranslator(lang, messages, `${lang}/together`);

  return (
    <div className="frame pt-10 pb-16 lg:pt-14">
      <header className="max-w-[68ch]">
        <p className="ink-kicker">{t("lobby.eyebrow")}</p>
        <h1 className="mt-3">{t("lobby.title")}</h1>
        <p className="mt-4 text-lg leading-relaxed">{t("lobby.lede")}</p>
      </header>
      <TogetherStrings locale={lang} messages={messages}>
        <Lobby items={items} />
      </TogetherStrings>
    </div>
  );
}
