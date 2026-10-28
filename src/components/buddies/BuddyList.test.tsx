import axe from "axe-core";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import together from "@/i18n/messages/en/together.json";
import { togetherT } from "@/components/realtime/messages";
import { BuddyList, buddyNames, type Entry } from "./BuddyList";

const t = togetherT("en", together);
const list = together.buddies.list;

const mira: Entry = { identityId: "usr_mira", displayName: "Mira", keyThumbprint: "abcdefghijklmnop", online: true };
const kai: Entry = { identityId: "usr_kai", displayName: "Kai", alias: "Kai from school", keyThumbprint: "zyxwvutsrqponm", online: false };

function setup(buddies: Entry[], offlineAsOf: number | null = null) {
  const handlers = { onRename: vi.fn(async () => {}), onRemove: vi.fn(async () => {}), onBlock: vi.fn(async () => {}) };
  render(<BuddyList buddies={buddies} t={t} offlineAsOf={offlineAsOf} {...handlers} />);
  return handlers;
}

test("the alias comes before the name, and the name stays as a second line", () => {
  setup([kai, mira]);
  expect(screen.getByText("Kai from school")).toBeTruthy();
  expect(screen.getByText(`Kai · ${list.offline}`)).toBeTruthy();
  expect(screen.getByText(list.online)).toBeTruthy();
});

test("two buddies who read the same are told apart by the start of their key", () => {
  const twin = { ...mira, identityId: "usr_twin", keyThumbprint: "12345678rest" };
  const names = buddyNames([mira, twin]);
  expect(names.get("usr_mira")).toBe("Mira (abcdefgh)");
  expect(names.get("usr_twin")).toBe("Mira (12345678)");
});

test("remove asks first and only then calls through", async () => {
  const { onRemove } = setup([mira]);
  fireEvent.click(screen.getByRole("button", { name: list.remove }));

  expect(onRemove).not.toHaveBeenCalled();
  expect(screen.getByText(list.removeConfirm.replace("{name}", "Mira"))).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: list.remove }));
  await waitFor(() => expect(onRemove).toHaveBeenCalledWith(mira));
});

test("cancel backs out of a block without calling", () => {
  const { onBlock } = setup([mira]);
  fireEvent.click(screen.getByRole("button", { name: list.block }));
  fireEvent.click(screen.getByRole("button", { name: list.cancel }));

  expect(onBlock).not.toHaveBeenCalled();
  expect(screen.getByRole("button", { name: list.block })).toBeTruthy();
});

test("rename saves the trimmed alias and Escape leaves the field", async () => {
  const { onRename } = setup([mira]);
  fireEvent.click(screen.getByRole("button", { name: list.rename }));
  const field = screen.getByRole("textbox", { name: list.rename });
  fireEvent.keyDown(field, { key: "Escape" });
  expect(screen.queryByRole("textbox")).toBeNull();

  fireEvent.click(screen.getByRole("button", { name: list.rename }));
  fireEvent.change(screen.getByRole("textbox", { name: list.rename }), { target: { value: "  Mira at work " } });
  fireEvent.click(screen.getByRole("button", { name: together.buddies.list.save }));
  await waitFor(() => expect(onRename).toHaveBeenCalledWith(mira, "Mira at work"));
});

test("a failed action says so in the row", async () => {
  const { onRemove } = setup([mira]);
  onRemove.mockRejectedValueOnce(new Error("no"));
  fireEvent.click(screen.getByRole("button", { name: list.remove }));
  fireEvent.click(screen.getByRole("button", { name: list.remove }));

  expect((await screen.findByRole("alert")).textContent).toBe(together.buddies.errors.generic);
});

test("the saved copy is labelled and its actions are off with the reason attached", () => {
  setup([mira], Date.UTC(2026, 9, 28, 12));
  const reason = screen.getByText(new RegExp(together.buddies.unreachable));
  const remove = screen.getByRole("button", { name: list.remove });

  expect((remove as HTMLButtonElement).disabled).toBe(true);
  expect(remove.getAttribute("aria-describedby")).toBe(reason.id);
});

test("the list has no serious accessibility problems", async () => {
  setup([mira, kai]);
  const result = await axe.run(document.body, { rules: { "color-contrast": { enabled: false } } });
  expect(result.violations.filter((v) => v.impact === "serious" || v.impact === "critical")).toEqual([]);
});
