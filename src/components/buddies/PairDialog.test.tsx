import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import together from "@/i18n/messages/en/together.json";
import { togetherT } from "@/components/realtime/messages";
import type { ServerClient } from "@/server-client/client";
import { ClientError, ServerUnreachable } from "@/server-client/types";
import type { Buddy, PairingCreated } from "@/server-client/types";
import { PairDialog, readPairingInput } from "./PairDialog";

const t = togetherT("en", together);
const pair = together.buddies.pair;
const TOKEN = "A".repeat(22);

const kai: Buddy = {
  identityId: "usr_kai",
  deviceId: "dev_kai",
  displayName: "Kai",
  keyThumbprint: "abcdefgh1234",
  pairedAt: "2026-10-28T00:00:00.000Z",
};

function created(expiresInMs: number): PairingCreated {
  const at = new Date(Date.now() + expiresInMs).toISOString();
  return {
    id: "pr_1",
    from: "usr_me",
    status: "open",
    createdAt: new Date().toISOString(),
    expiresAt: at,
    codeExpiresAt: at,
    token: TOKEN,
    url: "https://srv.test/together",
    code: "7QKX-2M9R4T",
  };
}

function fakeClient(over: Partial<ServerClient> = {}) {
  return {
    createPairing: vi.fn(async () => created(600_000)),
    revokePairing: vi.fn(async () => {}),
    listPairings: vi.fn(async () => ({ items: [], nextCursor: null })),
    listBuddies: vi.fn(async () => ({ items: [kai], nextCursor: null })),
    peekPairing: vi.fn(async () => ({ from: { displayName: "Kai" }, expiresAt: "2026-10-29T00:00:00.000Z" })),
    redeemPairing: vi.fn(async () => kai),
    ...over,
  } as unknown as ServerClient & Record<string, ReturnType<typeof vi.fn>>;
}

function open(client: ServerClient, start: "show" | "enter" = "show", initialInput?: string) {
  const onPaired = vi.fn();
  const onClose = vi.fn();
  render(<PairDialog client={client} t={t} start={start} initialInput={initialInput} onPaired={onPaired} onClose={onClose} />);
  return { onPaired, onClose };
}

beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));
afterEach(() => vi.useRealTimers());

test("a typed code and a pasted link both read as pairing references", () => {
  expect(readPairingInput("7qkx 2m9r4t")).toEqual({ code: "7qkx 2m9r4t" });
  expect(readPairingInput(`http://localhost/en/together#/pair/${TOKEN}`)).toEqual({ token: TOKEN });
  expect(readPairingInput("nope")).toBeNull();
});

test("Show a code shows the code, the QR and the link, and counts down", async () => {
  const client = fakeClient();
  open(client);

  expect((await screen.findByTestId("pair-code")).textContent).toBe("7QKX-2M9R4T");
  expect(await screen.findByRole("img", { name: pair.qr })).toBeTruthy();
  expect((screen.getByLabelText(pair.link) as HTMLInputElement).value).toBe(`${window.location.origin}/together#/pair/${TOKEN}`);
  expect(screen.getByText(pair.expires.replace("{time}", "10:00"))).toBeTruthy();

  await act(async () => {
    vi.advanceTimersByTime(65_000);
  });
  expect(screen.getByText(pair.expires.replace("{time}", "8:55"))).toBeTruthy();
});

test("Cancel pairing and Escape both close, and leaving revokes the open pairing", async () => {
  const client = fakeClient();
  const onClose = vi.fn();
  const view = render(<PairDialog client={client} t={t} start="show" onPaired={vi.fn()} onClose={onClose} />);
  await screen.findByTestId("pair-code");

  fireEvent.click(screen.getByRole("button", { name: pair.cancel }));
  fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
  expect(onClose).toHaveBeenCalledTimes(2);

  view.unmount();
  expect(client.revokePairing).toHaveBeenCalledWith("pr_1");
});

test("copy puts the link on the clipboard and says so", async () => {
  const writeText = vi.fn(async () => {});
  vi.stubGlobal("navigator", { ...navigator, clipboard: { writeText } });
  open(fakeClient());
  fireEvent.click(await screen.findByRole("button", { name: pair.copy }));

  await waitFor(() => expect(screen.getByText(pair.copied)).toBeTruthy());
  expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/together#/pair/${TOKEN}`);
  vi.unstubAllGlobals();
});

test("the friend joining shows their name and key, and tells the page", async () => {
  const client = fakeClient({
    listPairings: vi.fn(async () => ({
      items: [{ ...created(1000), status: "redeemed" as const, redeemedBy: "usr_kai" }],
      nextCursor: null,
    })),
  });
  const { onPaired } = open(client);
  await screen.findByTestId("pair-code");

  await act(async () => {
    vi.advanceTimersByTime(3100);
  });
  expect(await screen.findByText(pair.joined.replace("{name}", "Kai"))).toBeTruthy();
  expect(screen.getByText(pair.fingerprint.replace("{fingerprint}", "abcdefgh"))).toBeTruthy();
  expect(onPaired).toHaveBeenCalled();
});

test("a code that runs out is replaced by a new one", async () => {
  const client = fakeClient({ createPairing: vi.fn().mockResolvedValueOnce(created(2000)).mockResolvedValue(created(600_000)) });
  open(client);
  await screen.findByTestId("pair-code");

  await act(async () => {
    vi.advanceTimersByTime(2500);
  });
  await waitFor(() => expect(client.createPairing).toHaveBeenCalledTimes(2));
});

test("Enter a code looks the person up, then accepts", async () => {
  const client = fakeClient();
  const { onPaired } = open(client, "enter");

  fireEvent.change(screen.getByLabelText(pair.enterLabel), { target: { value: "7qkx-2m9r4t" } });
  fireEvent.click(screen.getByRole("button", { name: together.buddies.empty.enter }));
  expect(await screen.findByText(pair.peekFrom.replace("{name}", "Kai"))).toBeTruthy();
  expect(client.peekPairing).toHaveBeenCalledWith({ code: "7qkx-2m9r4t" });

  fireEvent.click(screen.getByRole("button", { name: pair.accept }));
  expect(await screen.findByText(pair.joined.replace("{name}", "Kai"))).toBeTruthy();
  expect(client.redeemPairing).toHaveBeenCalledWith({ code: "7qkx-2m9r4t" });
  expect(onPaired).toHaveBeenCalled();
});

test("a link from the page address is looked up on its own", async () => {
  const client = fakeClient();
  open(client, "enter", `http://localhost/en/together#/pair/${TOKEN}`);

  expect(await screen.findByText(pair.peekFrom.replace("{name}", "Kai"))).toBeTruthy();
  expect(client.peekPairing).toHaveBeenCalledWith({ token: TOKEN });
});

test("every kind of wrong code gets the same single message", async () => {
  const client = fakeClient({ peekPairing: vi.fn().mockRejectedValue(new ClientError("not_found", 404)) });
  open(client, "enter");

  fireEvent.change(screen.getByLabelText(pair.enterLabel), { target: { value: "7QKX-2M9R4T" } });
  fireEvent.click(screen.getByRole("button", { name: together.buddies.empty.enter }));
  expect((await screen.findByRole("alert")).textContent).toBe(pair.wrong);

  fireEvent.change(screen.getByLabelText(pair.enterLabel), { target: { value: "garbage" } });
  fireEvent.click(screen.getByRole("button", { name: together.buddies.empty.enter }));
  expect((await screen.findByRole("alert")).textContent).toBe(pair.wrong);
  expect(client.peekPairing).toHaveBeenCalledTimes(1);
});

test("limits and an unreachable server have their own words", async () => {
  const client = fakeClient({
    peekPairing: vi.fn().mockRejectedValueOnce(new ClientError("rate_limited", 429)).mockRejectedValueOnce(new ServerUnreachable()),
  });
  open(client, "enter");
  const submit = () => fireEvent.click(screen.getByRole("button", { name: together.buddies.empty.enter }));
  fireEvent.change(screen.getByLabelText(pair.enterLabel), { target: { value: "7QKX-2M9R4T" } });

  submit();
  expect((await screen.findByRole("alert")).textContent).toBe(pair.tooMany);
  fireEvent.change(screen.getByLabelText(pair.enterLabel), { target: { value: "7QKX-2M9R4V" } });
  submit();
  await waitFor(() => expect(screen.getByRole("alert").textContent).toBe(together.buddies.unreachable));
});

test("the tabs work from the keyboard", async () => {
  open(fakeClient());
  await screen.findByTestId("pair-code");
  const show = screen.getByRole("tab", { name: pair.show });
  show.focus();
  fireEvent.keyDown(show, { key: "ArrowRight" });

  expect(screen.getByRole("tab", { name: pair.enterCode }).getAttribute("aria-selected")).toBe("true");
});
