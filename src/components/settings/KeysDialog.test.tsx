import { render } from "@testing-library/react";
import { beforeEach, expect, test } from "vitest";
import { I18nProvider } from "@/i18n/client";
import common from "@/i18n/messages/en/common.json";
import { clearLog, readLog } from "@/lib/telemetry";
import { KeysDialog } from "./KeysDialog";

beforeEach(() => {
  localStorage.clear();
  clearLog();
});

test("a closed dialog still records page errors, and stops when it unmounts", () => {
  const { unmount } = render(
    <I18nProvider locale="en" messages={common.client}>
      <KeysDialog open={false} onClose={() => {}} />
    </I18nProvider>,
  );
  window.dispatchEvent(new ErrorEvent("error", { message: "boom" }));
  expect(readLog()).toHaveLength(1);
  unmount();
  window.dispatchEvent(new ErrorEvent("error", { message: "after" }));
  expect(readLog()).toHaveLength(1);
});
