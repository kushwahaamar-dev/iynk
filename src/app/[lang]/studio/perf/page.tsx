import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PerfHarness } from "@/components/studio/PerfHarness";
import { isLocale } from "@/i18n/config";
import { STUDIO_NAMESPACES, type StudioMessages } from "@/i18n/namespaces";
import { getMessages } from "@/i18n/server";

type Props = PageProps<"/[lang]/studio/perf">;

export const metadata: Metadata = { title: "Studio frame times", robots: { index: false, follow: false } };

export default function PerfPage({ params }: Props) {
  if (process.env.NEXT_PUBLIC_STUDIO_TEST !== "1") notFound();
  return (
    <Suspense>
      <Harness params={params} />
    </Suspense>
  );
}

async function Harness({ params }: Pick<Props, "params">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const loaded = await Promise.all(STUDIO_NAMESPACES.map((ns) => getMessages(lang, ns)));
  const messages = Object.fromEntries(STUDIO_NAMESPACES.map((ns, i) => [ns, loaded[i]])) as StudioMessages;
  return (
    <Suspense>
      <PerfHarness messages={messages} lang={lang} />
    </Suspense>
  );
}
