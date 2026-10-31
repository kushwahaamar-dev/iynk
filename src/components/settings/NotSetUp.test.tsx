import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { I18nProvider } from "@/i18n/client";
import common from "@/i18n/messages/en/common.json";
import { OPEN_KEYS_EVENT } from "./KeysDialog";
import { NotSetUp, type NotSetUpReason } from "./NotSetUp";

afterEach(() => vi.restoreAllMocks());

const show = (reason: NotSetUpReason, fix?: "ai" | "search") =>
  render(
    <I18nProvider locale="en" messages={common.client}>
      <NotSetUp what="Prices" reason={reason} fix={fix} />
    </I18nProvider>,
  );

test("needs_key names what is missing, the fix, and one press opens the keys dialog once", () => {
  const opened = vi.fn();
  window.addEventListener(OPEN_KEYS_EVENT, opened);
  show("needs_key", "search");
  const box = screen.getByTestId("not-set-up");
  expect(box.dataset.reason).toBe("needs_key");
  expect(box.textContent).toContain("Prices needs your own key.");
  expect(box.textContent).toContain(common.client.notSetUp.fix.search);

  fireEvent.click(screen.getByRole("button", { name: common.client.notSetUp.openKeys }));
  expect(opened).toHaveBeenCalledTimes(1);
  window.removeEventListener(OPEN_KEYS_EVENT, opened);
});

test("needs_key asks for an AI key unless told it is a search key", () => {
  show("needs_key");
  expect(screen.getByTestId("not-set-up").textContent).toContain(common.client.notSetUp.fix.ai);
});

test("server_off has no button and points at whoever runs the server", () => {
  show("server_off");
  const box = screen.getByTestId("not-set-up");
  expect(box.dataset.reason).toBe("server_off");
  expect(box.textContent).toContain("Prices is switched off on this server.");
  expect(box.textContent).toContain(common.client.notSetUp.fix.server);
  expect(screen.queryByRole("button")).toBeNull();
});
