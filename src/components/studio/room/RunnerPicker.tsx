"use client";

import type { Actor } from "@/protocol";
import { Select } from "@/components/ui";
import type { RunT } from "@/studio/room/run-state";

export type RoomPerson = { actor: Actor; name: string };

/** The host's way to hand the run to a faster device: a member list that issues `runner.set`. */
export function RunnerPicker({ people, runner, t, onPick }: { people: readonly RoomPerson[]; runner: Actor | null; t: RunT; onPick(to: Actor): void }) {
  return (
    <Select label={t("pickRunner")} value={runner ?? ""} onChange={(event) => event.target.value && onPick(event.target.value as Actor)}>
      {runner === null ? <option value="" /> : null}
      {people.map((person) => (
        <option key={person.actor} value={person.actor}>
          {person.name}
        </option>
      ))}
    </Select>
  );
}
