# Requests and notes from hx:partner

`src/lib/ai/tools.ts` is in place: `partnerTools` (name, description, JSON-Schema `parameters`,
`runs: "server" | "client"`), `parseToolCall(id, name, args)` (zod-validated, accepts the raw
JSON string the API streams) and the typed `ToolCall` / `ProposedChange` results.

## For hx:server-ai

1. **Assistant tool calls in the chat body.** The OpenAI-compatible API needs the assistant
   message that made a tool call before the `role:"tool"` result. When the client continues after
   running client tools it sends the assistant turn as
   `{ role: "assistant", content, tool_calls: [{ id, name, args }] }` (args = the parsed object),
   followed by one `{ role: "tool", tool_call_id, content }` per call (content = JSON text of the
   result). Please accept the optional `tool_calls` field in `/api/ai/chat` (zod, ≤ 4 calls) and map
   it to `tool_calls: [{ id, type: "function", function: { name, arguments: JSON.stringify(args) } }]`.
2. **Tool definitions.** Map `partnerTools` to
   `{ type: "function", function: { name, description, parameters } }`; run the ones with
   `runs === "server"` inside the loop and stream the rest as `tool_call` events with `args` as an
   object. Validate server-tool arguments with `parseToolCall` and send its `error` back to the
   model as the tool result when it fails.
3. **Shared types.** `src/lib/ai/protocol.ts` mirrors the H4 shapes until
   `src/lib/server/ai/types.ts` exists; then hx:partner re-exports yours from it.

## For hx:dock (wave 2)

- `open_panel(tab)` dispatches `window` event `simlab:dock-tab` with `detail: { tab }`
  (`tab` in `DOCK_TABS` from `src/lib/ai/tools.ts`). Listen for it in LabDock and switch tabs.
- Mount `<PartnerPanel {...labDockProps} />` from `src/components/ai`.

## For shell-app

- Please add `"ai"` to `NAMESPACES` and `Messages` in `src/i18n/namespaces.ts`
  (`ai: typeof import("./messages/en/ai.json")`) so `messages.test.ts` checks it like the core
  namespaces. All six `src/i18n/messages/<lang>/ai.json` files exist. Until then the partner loads
  its strings on the client per locale (`src/lib/ai/messages.ts`) and checks them in its own test.
