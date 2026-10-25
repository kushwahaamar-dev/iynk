import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageHead, eyebrow, page } from "@/components/editorial/Editorial";
import { FigureStill } from "@/components/figure";
import { TogetherStrings } from "@/components/realtime/messages";
import { cx } from "@/components/ui/cx";
import { createTranslator } from "@/i18n/translate";
import { isLocale } from "@/i18n/config";
import { alternatesFor } from "@/i18n/seo";
import { Lobby, LobbyLede } from "./Lobby";
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
    <Suspense fallback={<div className={cx(page, "min-h-[70vh]")} aria-busy="true" />}>
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
    <div className={cx(page, "pb-[clamp(72px,10vw,160px)]")}>
      <TogetherStrings locale={lang} messages={messages}>
        <PageHead
          label={t("lobby.eyebrow")}
          title={t("lobby.title")}
          lede={<LobbyLede />}
          aside={
            // One bench of each lab: a room opens on any of them.
            <ul className="grid grid-cols-3 gap-3 sm:gap-5">
              {STILLS.map(({ lab, item }) => (
                <li key={lab} className="min-w-0">
                  <FigureStill item={item} className="aspect-square sm:aspect-square" />
                  <p className={cx(eyebrow, "mt-2 truncate border-t border-rule pt-2")}>{t(`labs.${lab}`)}</p>
                </li>
              ))}
            </ul>
          }
        />
        <Lobby items={items} />
      </TogetherStrings>
    </div>
  );
}

const STILLS = [
  { lab: "board", item: "boards/uno-r3" },
  { lab: "robotics", item: "robotics/l298n" },
  { lab: "drone", item: "drones/quad5" },
] as const;
