import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import messages from "@/i18n/messages/en/faults.json";
import type { Diagnosis, Evidence } from "@/project/diagnosis";
import { DiagnosisRecord, type DiagnosisRecordProps } from "./DiagnosisRecord";

const reading: Evidence = { kind: "net-voltage", ref: "sda", at: 1_204_900_000, value: 0.1, unit: "V", provenance: "computed", tier: "T2", modelIds: [] };
const mocked: Evidence = { kind: "serial-line", ref: "serial", at: 5_000_000, value: "no ack", provenance: "mocked", tier: "T1", modelIds: [] };
const record: Diagnosis = { cause_id: "swapped-pins", symptom_id: "i2c-no-ack", evidence: [reading, mocked], hint_level: 1 };

const view = (props: Partial<DiagnosisRecordProps> = {}) => {
  const onDownload = vi.fn();
  const onCopy = vi.fn();
  render(
    <DiagnosisRecord
      diagnosis={record}
      outcome="assisted"
      projectId="prj_1"
      benchChecked={false}
      logOn={false}
      messages={messages}
      lang="en"
      onOpenSettings={() => {}}
      onDownload={onDownload}
      onCopy={onCopy}
      {...props}
    />,
  );
  return { onDownload, onCopy };
};

describe("DiagnosisRecord", () => {
  it("shows the evidence as a table with column headers", () => {
    view();
    const table = screen.getByRole("table");
    expect(within(table).getAllByRole("columnheader").map((h) => h.textContent)).toEqual(["Kind", "Reference", "Time", "Value", "Tier", "How it was found"]);
    expect(within(table).getAllByRole("row")).toHaveLength(3);
    expect(within(table).getByText("1,204 ms")).toBeTruthy();
    expect(within(table).getByText("0.1 V")).toBeTruthy();
  });

  it("names the tier and the provenance in words and labels a mocked value", () => {
    view();
    expect(screen.getByText("Calculated model")).toBeTruthy();
    expect(screen.getByText("Computed by the solver")).toBeTruthy();
    expect(screen.getByText(messages.fidelity.mocked)).toBeTruthy();
  });

  it("says a record without evidence was a guess", () => {
    view({ diagnosis: { ...record, evidence: [] } });
    expect(screen.getByText(messages.record.empty)).toBeTruthy();
    expect(screen.queryByRole("table")).toBeNull();
  });

  it("shows the not checked label until the bench has checked the cause", () => {
    view();
    expect(screen.getByText(messages.fidelity.notChecked)).toBeTruthy();
  });

  it("drops the label once the bench has checked it", () => {
    view({ benchChecked: true });
    expect(screen.queryByText(messages.fidelity.notChecked)).toBeNull();
  });

  it("exports once and copies the plain summary", () => {
    const { onDownload, onCopy } = view();
    fireEvent.click(screen.getByRole("button", { name: "Export" }));
    expect(onDownload).toHaveBeenCalledTimes(1);
    expect(onDownload.mock.calls[0]![0].filename).toBe("diagnosis-swapped-pins.json");
    fireEvent.click(screen.getByRole("button", { name: "Copy" }));
    expect(onCopy).toHaveBeenCalledWith(expect.stringContaining("cause: swapped-pins"));
  });

  it("shows the first 64 entries and a count of the rest", () => {
    view({ diagnosis: { ...record, evidence: Array.from({ length: 70 }, () => reading) } });
    expect(screen.getAllByRole("row")).toHaveLength(65);
    expect(screen.getByText("6 more entries are not shown.")).toBeTruthy();
  });

  it("reports whether the local log is on", () => {
    view({ logOn: true });
    expect(screen.getByText(messages.record.logOn)).toBeTruthy();
  });
});
