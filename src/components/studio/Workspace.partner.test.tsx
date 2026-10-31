import { cleanup, configure, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cryptoRandom } from "@/core/ids";
import { writeIynk } from "@/export/iynk";
import ai from "@/i18n/messages/en/ai.json";
import common from "@/i18n/messages/en/common.json";
import faults from "@/i18n/messages/en/faults.json";
import fidelity from "@/i18n/messages/en/fidelity.json";
import instruments from "@/i18n/messages/en/instruments.json";
import partinfo from "@/i18n/messages/en/partinfo.json";
import run from "@/i18n/messages/en/run.json";
import studio from "@/i18n/messages/en/studio.json";
import studioCode from "@/i18n/messages/en/studioCode.json";
import studioEdit from "@/i18n/messages/en/studioEdit.json";
import studioHome from "@/i18n/messages/en/studioHome.json";
import studioInspect from "@/i18n/messages/en/studioInspect.json";
import studioModels from "@/i18n/messages/en/studioModels.json";
import studioRun from "@/i18n/messages/en/studioRun.json";
import studioWire from "@/i18n/messages/en/studioWire.json";
import { I18nProvider } from "@/i18n/client";
import type { StudioMessages } from "@/i18n/namespaces";
import { createMemoryRepository } from "@/local/memory-repository";
import { createProjectHandler } from "@/local/project-handler";
import { createProjectHost } from "@/local/project-host";
import { createShadow } from "@/local/shadow";
import { createInlinePort } from "@/protocol";
import type { SimHost } from "@/sim-host/host";
import { LOCAL_ACTOR, loadStarter } from "@/studio/templates";
import { createServices, ServicesProvider } from "./wiring/services";
import { Workspace } from "./Workspace";

// The workspace builds its whole graph before the first region shows; the default one second is tight on a busy machine.
configure({ asyncUtilTimeout: 5000 });

const messages = { studio, studioHome, studioEdit, studioInspect, studioWire, studioCode, studioRun, studioModels, fidelity, instruments, faults, run, partinfo } as StudioMessages;
const partnerTab = studio.layout.tabs.partner;

async function mount() {
  const repo = createMemoryRepository();
  const host = createProjectHost({
    makePort: () => createInlinePort(createProjectHandler({ repo, shadowFactory: createShadow, clock: () => 1_790_000_000_000 })),
  });
  const sim = { load: vi.fn(async () => ({ diagnostics: [], runId: 1 })), control: vi.fn(), input: vi.fn(), onEvent: vi.fn(() => () => {}), staticCheck: vi.fn(async () => ({ findings: [], skipped: {}, errors: [] })), state: "ready", kill: vi.fn(async () => undefined) };
  const services = createServices({ host, sim: sim as unknown as SimHost });
  const project = await loadStarter("blink", { rnd: cryptoRandom, now: "2026-10-28T10:00:00.000Z", actor: LOCAL_ACTOR });
  const stored = await services.files.importBytes(writeIynk(project), `${project.meta.title}.iynk`);
  if (!stored.ok) throw new Error(stored.error.message);
  return render(
    <I18nProvider locale="en" messages={common.client}>
      <ServicesProvider factory={() => services}>
        <Workspace projectId={stored.id} autorun={false} messages={messages} lang="en" />
      </ServicesProvider>
    </I18nProvider>,
  );
}

beforeEach(() => {
  vi.stubGlobal("matchMedia", (query: string) => ({ matches: query.includes("min-width"), media: query, addEventListener: () => {}, removeEventListener: () => {} }));
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("Workspace partner tab", () => {
  it("adds a Partner tab to the right rail that opens the ask box", async () => {
    await mount();
    const tab = await screen.findByRole("tab", { name: partnerTab });
    fireEvent.click(tab);
    await waitFor(() => expect(tab.getAttribute("aria-selected")).toBe("true"));
    expect(await screen.findByRole("textbox", { name: ai.panel.inputLabel }, { timeout: 5000 })).toBeTruthy();
  });

  it("takes focus with Ctrl+/ from the canvas", async () => {
    await mount();
    const canvas = await screen.findByRole("application");
    fireEvent.keyDown(canvas, { key: "/", ctrlKey: true });
    const tab = screen.getByRole("tab", { name: partnerTab });
    await waitFor(() => expect(tab.getAttribute("aria-selected")).toBe("true"));
    await waitFor(() => expect(document.activeElement?.tagName).toBe("TEXTAREA"), { timeout: 5000 });
  });
});
