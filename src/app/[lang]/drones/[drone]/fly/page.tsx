import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getDataMessages } from "@/components/data";
import { LabRoom } from "@/components/dock/LabRoom";
import { UntranslatedNotice } from "@/components/shell";
import { loadCraft } from "@/components/dronelab/data";
import { FlyWorkspace } from "@/components/dronelab/FlyWorkspace";
import { contentT } from "@/components/dronelab/text";
import type { ChallengeEntry } from "@/components/flight/DailyChallenge";
import { DRONE_IDS } from "@/content/ids";
import { isLocale, type Locale } from "@/i18n/config";
import { alternatesFor } from "@/i18n/seo";
import { getMessages, getT } from "@/i18n/server";
import { flightOf } from "@/lib/flight";

type Props = PageProps<"/[lang]/drones/[drone]/fly">;

export function generateStaticParams() {
  return DRONE_IDS.map((drone) => ({ drone }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, drone } = await params;
  if (!isLocale(lang)) return {};
  const craft = await loadCraft(lang, drone);
  if (!craft) return {};
  const t = await getT(lang, "dronelab");
  const title = typeof craft.text.title === "string" ? craft.text.title : drone;
  return {
    title: t("meta.flyTitle", { title }),
    description: t("meta.flyDescription", { title }),
    alternates: alternatesFor(lang, `/drones/${drone}/fly`),
  };
}

export default function FlyPage({ params }: Props) {
  return (
    <Suspense fallback={<div className="min-h-[calc(100dvh-var(--header-h))]" aria-busy="true" />}>
      <Fly params={params} />
    </Suspense>
  );
}

async function Fly({ params }: Pick<Props, "params">) {
  const { lang, drone } = await params;
  if (!isLocale(lang)) notFound();
  const [craft, messages, flight, pool, data] = await Promise.all([
    loadCraft(lang, drone),
    getMessages(lang, "dronelab"),
    getMessages(lang, "flight"),
    challengePool(lang),
    getDataMessages(lang),
  ]);
  if (!craft) notFound();
  return (
    <LabRoom lab="drone" itemId={drone}>
      <FlyWorkspace
        lang={lang}
        content={craft.content}
        text={craft.text}
        messages={messages}
        flight={flight}
        pool={pool}
        board={data.leaderboard}
        notice={<UntranslatedNotice lang={lang} textLang={craft.textLang} variant="chip" />}
      />
    </LabRoom>
  );
}

const pools = new Map<Locale, Promise<ChallengeEntry[]>>();

/** Every craft that flies, with the courses the range has for it: the daily challenge picks from these. */
function challengePool(lang: Locale): Promise<ChallengeEntry[]> {
  let pool = pools.get(lang);
  if (!pool) {
    pool = Promise.all(DRONE_IDS.map((id) => loadCraft(lang, id))).then((crafts) =>
      crafts.flatMap((craft): ChallengeEntry[] => {
        const range = craft && flightOf(craft.content);
        if (!craft || !range?.courses.length) return [];
        const { content, text } = craft;
        const ct = contentT(lang, content.id, text);
        const courses = range.courses.map((c) => ({ id: c.id, kind: c.kind }));
        const titles = content.courses.filter((c) => courses.some((x) => x.id === c.id)).map((c) => [c.id, ct(c.title)]);
        const batts = Object.entries(content.design.batts);
        return [
          {
            id: content.id,
            title: ct(content.title),
            courses,
            batts: batts.map(([key]) => key),
            courseTitles: Object.fromEntries(titles),
            battLabels: Object.fromEntries(batts.map(([key, b]) => [key, b.label])),
          },
        ];
      }),
    );
    pools.set(lang, pool);
  }
  return pool;
}
