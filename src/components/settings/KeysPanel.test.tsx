import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, expect, test } from "vitest";
import { I18nProvider } from "@/i18n/client";
import common from "@/i18n/messages/en/common.json";
import { KEYS_STORAGE_KEY } from "@/lib/keys";
import { KeysPanel } from "./KeysPanel";

const CANARY = "iynk-canary-KEY-0001-do-not-use";
const keys = common.client.keys;

beforeEach(() => localStorage.clear());

const renderPanel = () =>
  render(
    <I18nProvider locale="en" messages={common.client}>
      <KeysPanel />
    </I18nProvider>,
  );

const aiField = () => screen.getByLabelText(keys.ai.label) as HTMLInputElement;

test("the fields are password inputs that browsers do not offer to save", () => {
  renderPanel();
  for (const label of [keys.ai.label, keys.search.label, keys.server.label]) {
    const field = screen.getByLabelText(label) as HTMLInputElement;
    expect(field.type).toBe("password");
    expect(field.autocomplete).toBe("off");
    expect(field.hasAttribute("name")).toBe(false);
  }
  expect(screen.getByText(keys.notice)).toBeTruthy();
});

test("saving shows the last four characters, clears the input and never prints the key", () => {
  const { container } = renderPanel();
  fireEvent.change(aiField(), { target: { value: CANARY } });
  fireEvent.change(screen.getByLabelText(keys.ai.labelOptional), { target: { value: "mine" } });
  fireEvent.click(screen.getByRole("button", { name: `${keys.save}: ${keys.ai.label}` }));

  expect(screen.getByText(/…-use/)).toBeTruthy();
  expect(screen.getByText(/\(mine\)/)).toBeTruthy();
  expect(screen.queryByLabelText(keys.ai.label)).toBeNull();
  expect(container.textContent).not.toContain(CANARY);
  expect(container.innerHTML).not.toContain(CANARY);
  expect(JSON.parse(localStorage.getItem(KEYS_STORAGE_KEY)!).ai.key).toBe(CANARY);
});

test("remove empties the slot and brings the field back with focus", () => {
  renderPanel();
  fireEvent.change(aiField(), { target: { value: CANARY } });
  fireEvent.click(screen.getByRole("button", { name: `${keys.save}: ${keys.ai.label}` }));
  fireEvent.click(screen.getByRole("button", { name: `${keys.remove}: ${keys.ai.label}` }));

  expect(localStorage.getItem(KEYS_STORAGE_KEY)).toBeNull();
  expect(aiField().value).toBe("");
  expect(document.activeElement).toBe(aiField());
});

test("a bad secret shows its message and keeps the draft", () => {
  renderPanel();
  fireEvent.change(aiField(), { target: { value: "has a space in it" } });
  fireEvent.click(screen.getByRole("button", { name: `${keys.save}: ${keys.ai.label}` }));
  expect(screen.getByRole("alert").textContent).toBe(keys.errors.badChars);
  expect(aiField().getAttribute("aria-invalid")).toBe("true");
  expect(aiField().value).toBe("has a space in it");

  fireEvent.change(aiField(), { target: { value: "" } });
  fireEvent.click(screen.getByRole("button", { name: `${keys.save}: ${keys.ai.label}` }));
  expect(screen.getByRole("alert").textContent).toBe(keys.errors.empty);
});

test("a key too short to show a tail still says it is saved", () => {
  renderPanel();
  fireEvent.change(screen.getByLabelText(keys.server.label), { target: { value: "shortpass" } });
  fireEvent.click(screen.getByRole("button", { name: `${keys.save}: ${keys.server.label}` }));
  expect(screen.getByText("Saved: …")).toBeTruthy();
});
