// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { TEMPLATES } from "../../../content/projects";
import { boardLoaders } from "@/content/index.generated";
import { legacyCause } from "@/content/faults/legacy-map";
import type { BoardId } from "@/content/ids";
import { causeMeta } from "@/sim/faults/causes";
import { faultOffers, type FaultLookup } from "./lesson-faults";

const unmappedFile = new URL("../../../content/projects/boards/faults.unmapped.json", import.meta.url);

describe("unmapped catalogue failures", () => {
  it("match the committed list for all lessons", async () => {
    const unmapped = new Set<string>();
    const lessons = TEMPLATES.filter((t) => t.kind === "lesson");
    for (const board of new Set(lessons.map((t) => t.board))) {
      const { failures } = (await boardLoaders[board as BoardId]!()).default;
      // A failure is offered when the registry models its cause in the simulator.
      const lookup: FaultLookup = (_board, failureId) => {
        const { cause_id, symptom_ids } = legacyCause(failures.find((f) => f.id === failureId)!);
        const meta = causeMeta(cause_id);
        if (!meta?.modelled || meta.seat !== "SIM") return null;
        return { faultId: `flt_legacy_${failureId}`, causeId: cause_id, symptomId: symptom_ids[0], title: failureId };
      };
      for (const lesson of lessons.filter((t) => t.board === board)) {
        for (const { failureId } of faultOffers(lesson.id, board, lookup, "en").unmapped) unmapped.add(`${board}/${failureId}`);
      }
    }
    expect([...unmapped].sort()).toEqual(JSON.parse(readFileSync(unmappedFile, "utf8")));
  });
});
