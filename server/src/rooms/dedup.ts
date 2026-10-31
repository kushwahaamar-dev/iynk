import type { DeviceId, RoomId, RoomsRepo, SubmissionRow } from "../store/rooms.ts";

/** The last `keep` committed submissions of each device, in memory; older ones are answered from the repo. */
export class DedupWindow {
  readonly #repo: RoomsRepo;
  readonly #room: RoomId;
  readonly #keep: number;
  readonly #recent = new Map<DeviceId, SubmissionRow[]>();

  constructor(repo: RoomsRepo, room: RoomId, keep: number) {
    this.#repo = repo;
    this.#room = room;
    this.#keep = keep;
  }

  lookup(device: DeviceId, firstOpId: string): SubmissionRow | null {
    const hit = this.#recent.get(device)?.find((row) => row.first_op_id === firstOpId);
    return hit ?? this.#repo.findSubmission(this.#room, device, firstOpId);
  }

  remember(row: SubmissionRow): void {
    const rows = this.#recent.get(row.device_id) ?? [];
    rows.push(row);
    if (rows.length > this.#keep) rows.shift();
    this.#recent.set(row.device_id, rows);
  }
}
