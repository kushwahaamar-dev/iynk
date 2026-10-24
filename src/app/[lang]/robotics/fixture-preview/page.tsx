// TEMPORARY local preview of the bench workspace with the unit-test fixture (ui:robotics). Deleted before hand-off.
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BenchWorkspace } from "@/components/robotics/BenchWorkspace";
import { isLocale } from "@/i18n/config";
import { getMessages } from "@/i18n/server";
import { fixtureBench, fixtureTexts } from "@/lib/robotics/__fixtures__/bench";

export default function Preview({ params }: PageProps<"/[lang]/robotics/fixture-preview">) {
  return (
    <Suspense fallback={null}>
      <Body params={params} />
    </Suspense>
  );
}

async function Body({ params }: Pick<PageProps<"/[lang]/robotics/fixture-preview">, "params">) {
  const { lang } = await params;
  if (!isLocale(lang) || process.env.NODE_ENV === "production") notFound();
  const all = await getMessages(lang, "robotics");
  const bench = { ...fixtureBench, figure: { ...fixtureBench.figure, page: "/figures/boards/nano.html" as const } };
  return (
    <div className="mx-auto max-w-7xl px-4 pb-16 pt-6 sm:px-6">
      <h1>{fixtureTexts.title}</h1>
      <div className="mt-6">
        <BenchWorkspace
          setup={{ bench, texts: fixtureTexts, starters: { "blink-led": "// " + fixtureTexts["tasks.blink-led.code.setup"] + "\nvoid setup() {}\nvoid loop() {}" }, solutions: { "blink-led": fixtureBench.tasks[0].solution } }}
          messages={{ bench: all.bench, steps: all.steps, faults: all.faults, status: all.status, current: all.current, serial: all.serial, modes: all.modes, tasks: all.tasks, quiz: all.quiz, keys: all.keys }}
        />
      </div>
    </div>
  );
}
