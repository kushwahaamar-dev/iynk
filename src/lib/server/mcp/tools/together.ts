import "server-only";
import { z } from "zod";
import { createRoom as roomLinkFor, ROOM_PARAM } from "@/lib/realtime/config";
import { MAX_PEERS } from "@/lib/realtime/protocol";
import { features } from "@/lib/server/env";
import { ENTRIES, LABS, findEntry, itemUrl } from "../content";
import { ToolError, defineTool } from "../registry";
import { labInput, localeInput } from "./catalog";

const [starter] = ENTRIES;

export const createRoom = defineTool({
  name: "create_room",
  title: "Open a live build room",
  description: `Makes a link to a fresh iynk build room on one item. Up to ${MAX_PEERS} people open the same link on any device, with no account, and wire, code and fly together, each in their own language. Nothing is stored until someone opens the link, and a room closes 30 minutes after its last person leaves. Without lab and id the room opens on the ${starter.id} board, iynk's first lesson.`,
  input: z.object({
    lab: labInput.optional(),
    id: z.string().trim().min(1).max(64).optional().describe("Item id from search_catalog."),
    locale: localeInput.describe("Language the room page opens in; everyone can switch."),
  }),
  output: z.object({
    room: z.string().describe("Six-character room code people can also type in."),
    link: z.string(),
    lab: z.enum(LABS),
    id: z.string(),
    maxPeople: z.number().int(),
  }),
  openWorld: false,
  idempotent: false,
  async run({ lab, id, locale }) {
    if (!features.realtime) {
      throw new ToolError("not_configured", "Live rooms are not set up on this deployment (there is no realtime relay), so a link would only join tabs of one browser.");
    }
    if ((lab === undefined) !== (id === undefined)) throw new ToolError("bad_input", "Give both lab and id, or neither.");
    const target = lab && id ? findEntry(lab, id) : starter;
    if (!target) throw new ToolError("not_found", `iynk has no ${lab} called "${id}". Use search_catalog to find the right id.`);
    const link = roomLinkFor(target.lab, target.id, locale);
    const room = new URL(link).searchParams.get(ROOM_PARAM);
    if (!room) throw new ToolError("internal", "iynk could not make a room link.");
    return { room, link, lab: target.lab, id: target.id, maxPeople: MAX_PEERS };
  },
});
