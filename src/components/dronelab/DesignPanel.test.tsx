import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import agrihex from "@/content/drones/agrihex";
import type { Locale } from "@/i18n/config";
import { DesignPanel } from "./DesignPanel";
import { contentT, droneLabT, type DroneLabMessages } from "./text";

// The design verdict can run to seven lines (agrihex): its first sentence is the verdict, in bold; the reasons
// after it are body text.
for (const lang of ["en", "de", "zh", "hi"] as const satisfies readonly Locale[]) {
  test(`the verdict's first sentence is bold and the rest is not (${lang})`, async () => {
    const messages = (await import(`@/i18n/messages/${lang}/dronelab.json`)).default as DroneLabMessages;
    const text = (await import(`@/i18n/content/${lang}/drones/agrihex.json`)).default as Record<string, unknown>;
    const ct = contentT(lang, agrihex.id, text);
    render(<DesignPanel lang={lang} content={agrihex} pick={agrihex.design.default} t={droneLabT(lang, messages)} ct={ct} onPick={() => {}} />);
    const verdict = screen.getByTestId("design-verdict");
    const lead = verdict.querySelector("strong");
    expect(lead).not.toBeNull();
    // the bold part is one sentence, well short of the whole verdict, and the paragraph itself is not bold
    expect(lead!.textContent!.length).toBeLessThan(verdict.textContent!.length / 2);
    expect(verdict.className).not.toMatch(/font-semibold|font-bold/);
  });
}
