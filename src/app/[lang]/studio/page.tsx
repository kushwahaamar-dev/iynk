import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { page } from "@/components/editorial/Editorial";
import { StudioLoader } from "@/components/studio/StudioLoader";
import { SwRegister } from "@/components/studio/SwRegister";
import { cx } from "@/components/ui/cx";
import { isLocale } from "@/i18n/config";
import { STUDIO_NAMESPACES, type StudioMessages } from "@/i18n/namespaces";
import { alternatesFor } from "@/i18n/seo";
import { getMessages, getT } from "@/i18n/server";

type Props = PageProps<"/[lang]/studio">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const t = await getT(lang, "studio");
  return { title: t("meta.title"), description: t("meta.description"), alternates: alternatesFor(lang, "/studio") };
}

export default function StudioPage({ params }: Props) {
  return (
    <Suspense fallback={<div className={cx(page, "min-h-[70vh]")} aria-busy="true" />}>
      <Studio params={params} />
    </Suspense>
  );
}

async function Studio({ params }: Pick<Props, "params">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const loaded = await Promise.all(STUDIO_NAMESPACES.map((ns) => getMessages(lang, ns)));
  const messages = Object.fromEntries(STUDIO_NAMESPACES.map((ns, i) => [ns, loaded[i]])) as StudioMessages;
  const strings = messages.studio;

  return (
    <div className={cx(page, "pb-24 pt-8 sm:pt-12")}>
      <header className="max-w-[65ch]">
        <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">{strings.title}</h1>
        <p className="mt-4 text-pretty text-base text-muted">{strings.lede}</p>
      </header>
      <StudioLoader messages={messages} lang={lang} />
      <SwRegister />
    </div>
  );
}
