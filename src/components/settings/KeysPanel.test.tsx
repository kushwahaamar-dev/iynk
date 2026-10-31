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

const searchField = () => screen.getByLabelText(keys.search.label) as HTMLInputElement;

test("the fields are password inputs that browsers do not offer to save", () => {
  renderPanel();
  const field = searchField();
  expect(field.type).toBe("password");
  expect(field.autocomplete).toBe("off");
  expect(field.hasAttribute("name")).toBe(false);
  expect(screen.queryByLabelText(keys.server.label)).toBeNull();
  expect(screen.getByText(keys.notice)).toBeTruthy();
});

test("saving shows the last four characters, clears the input and never prints the key", () => {
  const { container } = renderPanel();
  fireEvent.change(searchField(), { target: { value: CANARY } });
  fireEvent.click(screen.getByRole("button", { name: `${keys.save}: ${keys.search.label}` }));

  expect(screen.getByText(/…-use/)).toBeTruthy();
  expect(screen.queryByLabelText(keys.search.label)).toBeNull();
  expect(container.textContent).not.toContain(CANARY);
  expect(container.innerHTML).not.toContain(CANARY);
  expect(JSON.parse(localStorage.getItem(KEYS_STORAGE_KEY)!).search.key).toBe(CANARY);
});

test("remove empties the slot and brings the field back with focus", () => {
  renderPanel();
  fireEvent.change(searchField(), { target: { value: CANARY } });
  fireEvent.click(screen.getByRole("button", { name: `${keys.save}: ${keys.search.label}` }));
  fireEvent.click(screen.getByRole("button", { name: `${keys.remove}: ${keys.search.label}` }));

  expect(localStorage.getItem(KEYS_STORAGE_KEY)).toBeNull();
  expect(searchField().value).toBe("");
  expect(document.activeElement).toBe(searchField());
});

test("a bad secret shows its message and keeps the draft", () => {
  renderPanel();
  fireEvent.change(searchField(), { target: { value: "has a space in it" } });
  fireEvent.click(screen.getByRole("button", { name: `${keys.save}: ${keys.search.label}` }));
  expect(screen.getByRole("alert").textContent).toBe(keys.errors.badChars);
  expect(searchField().getAttribute("aria-invalid")).toBe("true");
  expect(searchField().value).toBe("has a space in it");

  fireEvent.change(searchField(), { target: { value: "" } });
  fireEvent.click(screen.getByRole("button", { name: `${keys.save}: ${keys.search.label}` }));
  expect(screen.getByRole("alert").textContent).toBe(keys.errors.empty);
});

test("a key too short to show a tail still says it is saved", () => {
  renderPanel();
  fireEvent.change(searchField(), { target: { value: "shortpass" } });
  fireEvent.click(screen.getByRole("button", { name: `${keys.save}: ${keys.search.label}` }));
  expect(screen.getByText("Saved: …")).toBeTruthy();
});

test("an invalid key puts the message in the field's described-by target", () => {
  renderPanel();
  fireEvent.change(searchField(), { target: { value: "has a space in it" } });
  fireEvent.click(screen.getByRole("button", { name: `${keys.save}: ${keys.search.label}` }));
  const target = document.getElementById(searchField().getAttribute("aria-describedby")!);
  expect(target?.textContent).toBe(keys.errors.badChars);
});
