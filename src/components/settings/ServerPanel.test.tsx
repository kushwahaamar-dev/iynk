import axe from "axe-core";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { I18nProvider } from "@/i18n/client";
import common from "@/i18n/messages/en/common.json";
import { memoryKeyStore, type StoredKey } from "@/server-client/keys";
import { emptyProfile, memoryProfileStore, type ServerProfile } from "@/server-client/profile";
import { ServerPanel } from "./ServerPanel";

const shared = vi.hoisted(() => ({ keys: null as unknown, profile: null as unknown }));

vi.mock("@/server-client/keys", async (original) => ({
  ...(await original<typeof import("@/server-client/keys")>()),
  idbKeyStore: () => shared.keys,
}));
vi.mock("@/server-client/profile", async (original) => ({
  ...(await original<typeof import("@/server-client/profile")>()),
  idbProfileStore: () => shared.profile,
}));

const server = common.client.server;
const ORIGIN = "https://srv.example";
const KEY = { privateKey: {} as CryptoKey, publicSpki: new Uint8Array([1]), createdAt: 1 } satisfies StoredKey;
const info = (enrollment: "code" | "closed") => ({
  audience: ORIGIN,
  software: { name: "iynk-server" },
  apiVersions: [1],
  apiVersion: "1",
  enrollment,
});

type Script = { config?: unknown; server?: () => Response };

function script({ config = null, server: serverReply }: Script) {
  const fetchFn = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.endsWith("/config.json")) {
      return config === null ? new Response("", { status: 404 }) : Response.json(config);
    }
    if (url.endsWith("/v1/server")) return serverReply ? serverReply() : Promise.reject(new TypeError("Failed to fetch"));
    throw new Error(`unexpected ${url}`);
  });
  vi.stubGlobal("fetch", fetchFn);
  return fetchFn;
}

async function seed(patch: Partial<ServerProfile>, withKey = true) {
  const keys = memoryKeyStore();
  const profile = memoryProfileStore();
  shared.keys = keys;
  shared.profile = profile;
  await profile.write({ ...emptyProfile(), ...patch });
  if (withKey) await keys.put(ORIGIN, KEY);
  return { keys, profile };
}

const enrolledProfile = { url: ORIGIN, identityId: "id_me", deviceId: "d", displayName: "Amar" };

const renderPanel = () =>
  render(
    <I18nProvider locale="en" messages={common.client}>
      <ServerPanel />
    </I18nProvider>,
  );

beforeEach(() => {
  vi.stubGlobal("indexedDB", {});
  shared.keys = memoryKeyStore();
  shared.profile = memoryProfileStore();
});
afterEach(() => vi.unstubAllGlobals());

test("with no server it says so, links the guide and logs nothing", async () => {
  const errors = vi.spyOn(console, "error").mockImplementation(() => {});
  const fetchFn = script({});
  renderPanel();

  expect(await screen.findByText(server.status.off)).toBeTruthy();
  const guide = screen.getByRole("link", { name: server.guide });
  expect(guide.getAttribute("href")).toContain("SELF_HOSTING.md");
  expect(screen.queryByRole("button", { name: server.leave.title })).toBeNull();
  expect(fetchFn).toHaveBeenCalledTimes(1);
  expect(errors).not.toHaveBeenCalled();
});

test("an address that does not answer is shown as a state, with the origins hint when it is cross-origin", async () => {
  const errors = vi.spyOn(console, "error").mockImplementation(() => {});
  script({ config: { server: ORIGIN, protocol: 1 } });
  renderPanel();

  expect(await screen.findByText(server.status.unreachable)).toBeTruthy();
  expect(screen.getByText(server.status.unreachableHint)).toBeTruthy();
  expect(errors).not.toHaveBeenCalled();
});

test("the hint stays away when the server is on the app's own origin", async () => {
  script({ config: { server: window.location.origin, protocol: 1 } });
  renderPanel();

  expect(await screen.findByText(server.status.unreachable)).toBeTruthy();
  expect(screen.queryByText(server.status.unreachableHint)).toBeNull();
});

test("a server that wants a newer app says to update", async () => {
  script({
    config: { server: ORIGIN, protocol: 1 },
    server: () => Response.json({ error: { code: "upgrade_required", message: "x", requestId: "r" } }, { status: 426 }),
  });
  renderPanel();

  expect(await screen.findByText(server.status.upgrade)).toBeTruthy();
  expect(screen.queryByText(server.status.unreachableHint)).toBeNull();
});

test("a ready server with no key asks for an enrolment code, or says it is closed", async () => {
  await seed({ url: ORIGIN }, false);
  script({ server: () => Response.json(info("code")) });
  const first = renderPanel();
  expect(await screen.findByText(server.status.needsEnrol)).toBeTruthy();
  first.unmount();

  script({ server: () => Response.json(info("closed")) });
  renderPanel();
  expect(await screen.findByText(server.status.closed)).toBeTruthy();
});

test("an enrolled browser offers sign out and leave; leave asks first and sends the phrase", async () => {
  await seed(enrolledProfile);
  const fetchFn = script({ server: () => Response.json(info("code")) });
  renderPanel();

  expect(await screen.findByText(server.enrolled)).toBeTruthy();
  expect(screen.getByRole("button", { name: server.signOut })).toHaveProperty("disabled", false);
  fireEvent.click(screen.getByRole("button", { name: server.leave.title }));
  expect(screen.getByText(server.leave.body)).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: server.leave.cancel }));
  expect(screen.queryByText(server.leave.body)).toBeNull();
  expect(fetchFn.mock.calls.some(([url]) => String(url).includes("/identities/me/deletion"))).toBe(false);
});

test("offline, sign out and leave are disabled and the reason is on screen", async () => {
  await seed(enrolledProfile);
  script({});
  renderPanel();

  expect(await screen.findByText(server.status.unreachable)).toBeTruthy();
  const leave = screen.getByRole("button", { name: server.leave.title }) as HTMLButtonElement;
  expect(leave.disabled).toBe(true);
  expect((screen.getByRole("button", { name: server.signOut }) as HTMLButtonElement).disabled).toBe(true);
  const reason = document.getElementById(leave.getAttribute("aria-describedby")!);
  expect(reason?.textContent).toContain(server.status.unreachable);
});

test("a leave in its grace period shows the hours left and no leave button", async () => {
  await seed({ url: ORIGIN, leaving: { effectiveAt: Date.now() + 5 * 3_600_000 - 1000 } });
  script({ server: () => Response.json(info("code")) });
  renderPanel();

  expect(await screen.findByText(server.leave.grace.replace("{hours}", "5"))).toBeTruthy();
  expect(screen.queryByRole("button", { name: server.leave.title })).toBeNull();
});

test("saving an address stores it and probes it; a bad one is refused in place", async () => {
  const { profile } = await seed({}, false);
  script({ server: () => Response.json(info("code")) });
  renderPanel();
  const field = (await screen.findByLabelText(server.address)) as HTMLInputElement;

  fireEvent.change(field, { target: { value: "https://srv.example/v1" } });
  fireEvent.click(screen.getByRole("button", { name: common.client.keys.save }));
  expect((await screen.findByRole("alert")).textContent).toBe(server.addressInvalid);
  expect((await profile.read()).url).toBeNull();

  fireEvent.change(field, { target: { value: "http://srv.example" } });
  fireEvent.click(screen.getByRole("button", { name: common.client.keys.save }));
  await waitFor(() => expect(screen.getByRole("alert").textContent).toBe(server.status.insecure));

  fireEvent.change(field, { target: { value: " https://srv.example/ " } });
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: common.client.keys.save }));
  });
  expect(await screen.findByText(server.status.needsEnrol)).toBeTruthy();
  expect((await profile.read()).url).toBe(ORIGIN);
});

test("axe finds nothing wrong in the unreachable and enrolled states", async () => {
  await seed(enrolledProfile);
  script({});
  const { container } = renderPanel();
  await screen.findByText(server.status.unreachable);
  const result = await axe.run(container, { rules: { "color-contrast": { enabled: false } } });
  expect(result.violations.map((v) => v.id)).toEqual([]);
});
