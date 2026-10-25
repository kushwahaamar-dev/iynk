import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import type { FigureHandle, FigureTraffic } from "@/components/figure/protocol";
import { forgetDevnetKeypair } from "@/lib/solana/devnet-wallet";

const features = vi.hoisted(() => ({ solana: true }));
vi.mock("@/lib/features", () => ({
  useFeatures: () => ({ status: "ready", features: { ai: false, image: false, voice: false, search: false, solana: features.solana, db: false, realtime: false, gemini: false } }),
  reloadFeatures: () => {},
}));
vi.mock("@/i18n/client", () => ({ useLocale: () => "en" }));
vi.mock("next/link", () => ({ default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a> }));

const { PassportPanel } = await import("./PassportPanel");

function fakeFigure() {
  let listener: ((traffic: FigureTraffic) => void) | null = null;
  let at = 0;
  const figure = {
    send: vi.fn(),
    observe: (fn: (traffic: FigureTraffic) => void) => {
      listener = fn;
      return () => (listener = null);
    },
    isReady: () => true,
    info: () => null,
    focus: () => {},
  } as unknown as FigureHandle;
  const report = (state: Record<string, unknown>) =>
    act(() => {
      at += 500;
      listener?.({ dir: "in", at, message: { type: "state", state, changed: [] } });
    });
  return { figure, report };
}

const BUILT = { FRAME: 0, MOTORS: 0, ESC: 0, WIRES: 0, FC: 0, XT60: 0, CAM: 0, RX: 0, VTX: 0, TOP: 0, BATT: 0, PROPS: 0 };
const { PROPS: _, ...NO_PROPS } = BUILT;
const base = { placed: BUILT, plugged: false, fault: null, test: null, smokeOk: true, motorOk: true, accOk: true };

const store = { getState: () => ({}), subscribe: () => () => {}, dispatch: () => {} };

beforeEach(() => {
  features.solana = true;
});

afterEach(() => {
  forgetDevnetKeypair();
  localStorage.clear();
  vi.unstubAllGlobals();
});

test("says so when Proof of Build is not set up", async () => {
  features.solana = false;
  await act(async () => {
    render(<PassportPanel lab="drone" itemId="quad5" store={store} figure={null} />);
  });
  expect(await screen.findByText("Proof of Build is not set up on this deployment")).toBeTruthy();
});

test("explains what other labs can earn", async () => {
  render(<PassportPanel lab="board" itemId="uno-r3" store={store} figure={null} />);
  expect(await screen.findByText(/Today you can earn the bench safety credential/)).toBeTruthy();
});

test("follows the bench live, then mints through the server", async () => {
  const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
    const body = JSON.parse(String(init.body));
    expect(body).toMatchObject({ kind: "drone-safety", itemId: "quad5", run: { v: 1, kind: "drone-safety", itemId: "quad5" } });
    return Response.json({
      signature: "5ig",
      credential: "Cred1111111111111111111111111111111111111111",
      skillId: "drone:quad5:safety",
      replayHash: "ab".repeat(32),
      score: 100,
      paid: [{ bounty: "Bnty111111111111111111111111111111111111111", amount: 50_000_000 }],
    });
  });
  vi.stubGlobal("fetch", fetchMock);
  const { figure, report } = fakeFigure();
  await act(async () => {
    render(<PassportPanel lab="drone" itemId="quad5" store={store} figure={figure} />);
  });

  expect(await screen.findByText(/Waiting for the figure/)).toBeTruthy();
  const mint = () => screen.getByRole("button", { name: "Mint my credential" }) as HTMLButtonElement;
  expect(mint().disabled).toBe(true);

  report(base);
  report({ ...base, placed: NO_PROPS });
  report({ ...base, placed: NO_PROPS, test: "smoke" });
  report({ ...base, placed: NO_PROPS });
  report({ ...base, placed: NO_PROPS, test: "motors", plugged: true });
  report({ ...base, placed: NO_PROPS, plugged: true });
  report({ ...base, placed: NO_PROPS });
  report({ ...base, placed: NO_PROPS, test: "calibrate" });
  report({ ...base, placed: NO_PROPS });
  expect(screen.getByText("Recording this run from the figure.")).toBeTruthy();
  expect(screen.getByText("100/100")).toBeTruthy();
  expect(mint().disabled).toBe(true);
  expect(screen.getByText("Connect a wallet to mint.")).toBeTruthy();

  fireEvent.click(screen.getByRole("button", { name: "Use a iynk devnet wallet" }));
  await waitFor(() => expect(mint().disabled).toBe(false));
  fireEvent.click(mint());

  expect(await screen.findByText("Credential minted")).toBeTruthy();
  expect(screen.getByText("0.05 SOL from bounty Bnty…1111")).toBeTruthy();
  expect(screen.getByRole("link", { name: /View the transaction/ }).getAttribute("href")).toBe("https://explorer.solana.com/tx/5ig?cluster=devnet");
  expect(fetchMock).toHaveBeenCalledWith("/api/solana/attest", expect.anything());
});

test("a broken safety rule blocks minting and says which", async () => {
  const { figure, report } = fakeFigure();
  render(<PassportPanel lab="drone" itemId="quad5" store={store} figure={figure} />);
  await screen.findByText(/Waiting for the figure/);
  report(base);
  report({ ...base, test: "motors", plugged: true });
  expect(screen.getByText(/motors spun with props on/)).toBeTruthy();
});
