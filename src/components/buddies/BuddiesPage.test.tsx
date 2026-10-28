import axe from "axe-core";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { I18nProvider } from "@/i18n/client";
import common from "@/i18n/messages/en/common.json";
import together from "@/i18n/messages/en/together.json";
import { TogetherStrings } from "@/components/realtime/messages";
import { memoryKeyStore, type StoredKey } from "@/server-client/keys";
import { emptyProfile, memoryProfileStore, type ServerProfile } from "@/server-client/profile";
import { ClientError, NeedsEnrolment, ServerUnreachable } from "@/server-client/types";
import type { Buddy } from "@/server-client/types";
import { BuddiesPage } from "./BuddiesPage";

const shared = vi.hoisted(() => ({
  keys: null as unknown,
  profile: null as unknown,
  client: null as unknown,
}));

vi.mock("@/server-client/keys", async (original) => ({
  ...(await original<typeof import("@/server-client/keys")>()),
  idbKeyStore: () => shared.keys,
}));
vi.mock("@/server-client/profile", async (original) => ({
  ...(await original<typeof import("@/server-client/profile")>()),
  idbProfileStore: () => shared.profile,
}));
vi.mock("@/server-client/client", () => ({ createClient: () => shared.client }));

const b = together.buddies;
const ORIGIN = "https://srv.example";
const KEY = { privateKey: {} as CryptoKey, publicSpki: new Uint8Array([1]), createdAt: 1 } satisfies StoredKey;
const enrolled = { url: ORIGIN, identityId: "id_me", deviceId: "d", displayName: "Amar" };

const mira: Buddy = {
  identityId: "usr_mira",
  deviceId: "dev_mira",
  displayName: "Mira",
  keyThumbprint: "abcdefgh1234",
  pairedAt: "2026-10-28T00:00:00.000Z",
  online: true,
};

function client(over: Record<string, unknown> = {}) {
  return {
    listBuddies: vi.fn(async () => ({ items: [], nextCursor: null })),
    enrol: vi.fn(async () => ({ id: "id_me", deviceId: "d", displayName: "Amar" })),
    ...over,
  };
}

function serve(o: { enrollment?: "code" | "closed"; server?: string | null; down?: boolean } = {}) {
  const server = o.server === undefined ? ORIGIN : o.server;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/config.json")) return server ? Response.json({ server, protocol: 1 }) : new Response("", { status: 404 });
      if (o.down) throw new TypeError("Failed to fetch");
      return Response.json({ audience: ORIGIN, software: { name: "iynk-server" }, apiVersions: [1], apiVersion: "1", enrollment: o.enrollment ?? "code" });
    }),
  );
}

async function seed(patch: Partial<ServerProfile>, withKey = true) {
  const keys = memoryKeyStore();
  const profile = memoryProfileStore();
  shared.keys = keys;
  shared.profile = profile;
  await profile.write({ ...emptyProfile(), ...patch });
  if (withKey) await keys.put(ORIGIN, KEY);
  return profile;
}

const renderPage = () =>
  render(
    <I18nProvider locale="en" messages={common.client}>
      <TogetherStrings locale="en" messages={together}>
        <BuddiesPage />
      </TogetherStrings>
    </I18nProvider>,
  );

beforeEach(() => {
  vi.stubGlobal("indexedDB", {});
  window.history.replaceState(null, "", "/en/together");
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

test("without a server it says buddies need one and links the guide", async () => {
  await seed({});
  serve({ server: null });
  renderPage();

  expect(await screen.findByText(b.needsServer.title)).toBeTruthy();
  expect(screen.getByText(b.needsServer.body)).toBeTruthy();
  expect(screen.getByRole("link", { name: b.needsServer.guide }).getAttribute("href")).toContain("SELF_HOSTING.md");
});

test("on a page the browser does not trust it says the page needs a secure connection", async () => {
  await seed({ url: "http://srv.example" }, false);
  serve({ server: "http://srv.example" });
  vi.stubGlobal("isSecureContext", false);
  renderPage();

  expect(await screen.findByText(b.insecure.title)).toBeTruthy();
  expect(screen.queryByLabelText(b.enrol.code)).toBeNull();
});

test("not enrolled shows the code and name fields, no email or password, and the code from the address", async () => {
  await seed({ url: ORIGIN }, false);
  serve({});
  window.history.replaceState(null, "", "/en/together#enrol=7QKX2M9R4TBV");
  renderPage();

  const code = (await screen.findByLabelText(b.enrol.code)) as HTMLInputElement;
  expect(code.value).toBe("7QKX2M9R4TBV");
  expect(screen.getByLabelText(b.enrol.name)).toBeTruthy();
  expect(document.querySelector('input[type="email"], input[type="password"]')).toBeNull();
  expect(window.location.hash).toBe("");
});

test("a closed server says it is not taking new people", async () => {
  await seed({ url: ORIGIN }, false);
  serve({ enrollment: "closed" });
  renderPage();

  expect(await screen.findByText(b.enrol.closed)).toBeTruthy();
});

test("enrolling saves who you are and lands on the empty list", async () => {
  const profile = await seed({ url: ORIGIN }, false);
  const keys = shared.keys as ReturnType<typeof memoryKeyStore>;
  serve({});
  const fake = client({
    enrol: vi.fn(async () => {
      await keys.put(ORIGIN, KEY);
      return { id: "id_me", deviceId: "d", displayName: "Amar" };
    }),
  });
  shared.client = fake;
  renderPage();

  fireEvent.change(await screen.findByLabelText(b.enrol.code), { target: { value: "7QKX-2M9R-4TBV" } });
  fireEvent.change(screen.getByLabelText(b.enrol.name), { target: { value: "Amar" } });
  fireEvent.click(screen.getByRole("button", { name: b.enrol.submit }));

  expect(await screen.findByText(b.empty.title)).toBeTruthy();
  expect(fake.enrol).toHaveBeenCalledWith({ code: "7QKX-2M9R-4TBV", displayName: "Amar", locale: "en" });
  expect(screen.getByText(b.joined.replace("{name}", "Amar"))).toBeTruthy();
  expect(await profile.read()).toMatchObject({ identityId: "id_me", displayName: "Amar", url: ORIGIN });
});

test("a wrong enrolment code gets one plain message", async () => {
  await seed({ url: ORIGIN }, false);
  serve({});
  shared.client = client({ enrol: vi.fn().mockRejectedValue(new ClientError("unauthorized", 401)) });
  renderPage();

  fireEvent.change(await screen.findByLabelText(b.enrol.code), { target: { value: "7QKX2M9R4TBV" } });
  fireEvent.change(screen.getByLabelText(b.enrol.name), { target: { value: "Amar" } });
  fireEvent.click(screen.getByRole("button", { name: b.enrol.submit }));

  expect((await screen.findByRole("alert")).textContent).toBe(b.enrol.wrongCode);
});

test("an enrolled person with no buddies sees the empty state with both ways in", async () => {
  await seed(enrolled);
  serve({});
  shared.client = client();
  renderPage();

  expect(await screen.findByText(b.empty.title)).toBeTruthy();
  expect(screen.getByRole("button", { name: b.empty.add })).toBeTruthy();
  expect(screen.getByRole("button", { name: b.empty.enter })).toBeTruthy();
});

test("the list shows buddies, caches them, and opens the pairing dialog from Add a buddy", async () => {
  const profile = await seed(enrolled);
  serve({});
  shared.client = client({
    listBuddies: vi.fn(async () => ({ items: [mira], nextCursor: null })),
    createPairing: vi.fn(async () => new Promise(() => {})),
  });
  renderPage();

  expect(await screen.findByText("Mira")).toBeTruthy();
  expect((await profile.read()).buddyCache?.items).toEqual([{ identityId: "usr_mira", displayName: "Mira", alias: undefined, color: undefined }]);

  fireEvent.click(screen.getByRole("button", { name: b.empty.add }));
  expect(await screen.findByRole("dialog")).toBeTruthy();
});

test("when the server cannot be reached the saved list shows as offline with its actions off", async () => {
  await seed({ ...enrolled, buddyCache: { at: Date.UTC(2026, 9, 28), items: [{ identityId: "usr_mira", displayName: "Mira" }] } });
  serve({ down: true });
  renderPage();

  expect(await screen.findByText("Mira")).toBeTruthy();
  expect(screen.getByText(new RegExp(b.unreachable))).toBeTruthy();
  expect((screen.getByRole("button", { name: b.list.remove }) as HTMLButtonElement).disabled).toBe(true);
});

test("with nothing saved, an unreachable server is one calm line", async () => {
  await seed(enrolled);
  serve({ down: true });
  renderPage();

  expect(await screen.findByText(b.unreachable)).toBeTruthy();
});

test("a server that no longer knows this browser says so and offers the enrol form", async () => {
  await seed(enrolled);
  serve({});
  shared.client = client({ listBuddies: vi.fn().mockRejectedValue(new NeedsEnrolment()) });
  renderPage();

  expect(await screen.findByText(b.unknown.title)).toBeTruthy();
  expect(screen.getByLabelText(b.enrol.code)).toBeTruthy();
});

test("the list refreshes every 15 seconds while the tab is visible and not while it is hidden", async () => {
  await seed(enrolled);
  serve({});
  const fake = client();
  shared.client = fake;
  vi.useFakeTimers({ shouldAdvanceTime: true });
  renderPage();
  await screen.findByText(b.empty.title);
  expect(fake.listBuddies).toHaveBeenCalledTimes(1);

  vi.advanceTimersByTime(15_000);
  await waitFor(() => expect(fake.listBuddies).toHaveBeenCalledTimes(2), { timeout: 5000 });

  vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
  vi.advanceTimersByTime(45_000);
  expect(fake.listBuddies).toHaveBeenCalledTimes(2);
  vi.restoreAllMocks();
});

test("a pairing link in the address opens the dialog on Enter a code once enrolled", async () => {
  await seed(enrolled);
  serve({});
  const peekPairing = vi.fn(async () => ({ from: { displayName: "Kai" }, expiresAt: "2026-10-29T00:00:00.000Z" }));
  shared.client = client({ peekPairing });
  window.history.replaceState(null, "", `/en/together#/pair/${"B".repeat(22)}`);
  renderPage();

  expect(await screen.findByText(b.pair.peekFrom.replace("{name}", "Kai"))).toBeTruthy();
  expect(peekPairing).toHaveBeenCalledWith({ token: "B".repeat(22) });
});

test("outside the together strings the page renders nothing", async () => {
  await seed(enrolled);
  serve({});
  const view = render(
    <I18nProvider locale="en" messages={common.client}>
      <BuddiesPage />
    </I18nProvider>,
  );
  expect(view.container.textContent).toBe("");
});

test("the empty state has no serious accessibility problems", async () => {
  await seed(enrolled);
  serve({});
  shared.client = client();
  renderPage();
  await screen.findByText(b.empty.title);

  const result = await axe.run(document.body, { rules: { "color-contrast": { enabled: false } } });
  expect(result.violations.filter((v) => v.impact === "serious" || v.impact === "critical")).toEqual([]);
});

test("an unreachable client during a refresh keeps the page calm", async () => {
  await seed(enrolled);
  serve({});
  shared.client = client({ listBuddies: vi.fn().mockRejectedValue(new ServerUnreachable()) });
  renderPage();

  expect(await screen.findByText(b.unreachable)).toBeTruthy();
});
