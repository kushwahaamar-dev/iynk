import { expect, test } from "vitest";
import { createTranslator, messageKeys } from "./translate";

const messages = {
  greeting: "Hello, {name}",
  nested: { count: "{done}/{total}", deeper: { leaf: "deep" } },
  lessons: { one: "{count} lesson", other: "{count} lessons" },
};

test("looks up dot paths and fills placeholders", () => {
  const t = createTranslator("en", messages);
  expect(t("greeting", { name: "Ada" })).toBe("Hello, Ada");
  expect(t("nested.deeper.leaf")).toBe("deep");
  expect(t("nested.count", { done: 3, total: 16 })).toBe("3/16");
});

test("resolves keys that contain dots themselves", () => {
  const tree = { connector: { "barrel-5.5x2.1": "Barrel jack {volts} V", usb: "USB" }, "a.b": { c: "ab-c" } };
  const t = createTranslator("en", tree);
  expect(t("connector.barrel-5.5x2.1", { volts: 9 })).toBe("Barrel jack 9 V");
  expect(t("connector.usb")).toBe("USB");
  expect(t("a.b.c")).toBe("ab-c");
  expect(messageKeys(tree)).toContain("connector.barrel-5.5x2.1");
  expect(() => t("connector.barrel-5" as never)).toThrow(/no string/);
});

test("formats numbers for the language", () => {
  const t = createTranslator("de", { big: "{n} mAh" });
  expect(t("big", { n: 1500 })).toBe("1.500 mAh");
});

test("picks plural forms with the language's rules", () => {
  const t = createTranslator("en", messages);
  expect(t("lessons", { count: 1 })).toBe("1 lesson");
  expect(t("lessons", { count: 4 })).toBe("4 lessons");
  expect(() => t("lessons")).toThrow(/count/);
});

test("never falls back: a missing key or parameter throws", () => {
  const t = createTranslator("es", messages, "es/test");
  // @ts-expect-error -- not a key of the messages
  expect(() => t("nope")).toThrow('no string "nope" in es/test');
  // @ts-expect-error -- a branch, not a leaf
  expect(() => t("nested")).toThrow(/no string/);
  expect(() => t("greeting")).toThrow(/needs the parameter "name"/);
});

test("messageKeys lists every leaf, plural sets included", () => {
  expect(messageKeys(messages).sort()).toEqual(["greeting", "lessons", "nested.count", "nested.deeper.leaf"]);
});
