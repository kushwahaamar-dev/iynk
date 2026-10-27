// Targeted test: the reply to an accepted op is lost, the op falls out of the tail window, the client resends.
import { Client } from "./client.js";
import { Server } from "./server.js";

function scenario(bugs) {
  const server = new Server({ retention: 4, ckptEvery: 2, bugs });
  const out = [];
  const a = new Client("a", (m) => out.push(m), bugs);
  const b = new Client("b", () => {}, bugs);
  const deliver = (c, msgs) => msgs.forEach((m) => c.receive(m));
  // a connects
  a.onConnect();
  const w = server.hello(out.pop().lastSeq);
  deliver(a, [{ t: "welcome", snapshot: w.snapshot, entries: w.entries.map((e) => server.frame(e, "a")) }]);
  a.submit({ k: "addPart", id: "a-p1", type: "led", x: 1, y: 1 });
  const m1 = out.pop();
  const r1 = server.submit(m1.cid, m1.opId, m1.baseRev, m1.op); // processed, reply lost
  a.submit({ k: "movePart", id: "a-p1", x: 5, y: 5 }); // queued behind in-flight
  a.onDisconnect();
  // others push the op out of the log window
  for (let i = 0; i < 8; i++) server.submit("b", `b:${i}`, 0, { k: "movePart", id: "a-p1", x: 100 + i, y: 0 });
  a.onConnect();
  const w2 = server.hello(out.pop().lastSeq);
  const snapshotMode = !!w2.snapshot;
  deliver(a, [{ t: "welcome", snapshot: w2.snapshot, entries: w2.entries.map((e) => server.frame(e, "a")) }]);
  // client resent its in-flight addPart
  const resent = out.pop();
  const r = server.submit(resent.cid, resent.opId, resent.baseRev, resent.op);
  return { snapshotMode, resentOpId: resent.opId, secondResult: r.type + (r.dup ? "(dup)" : "") + (r.reason ? ":" + r.reason : ""), seq: server.seq };
}
console.log("with dedup   :", JSON.stringify(scenario({})));
console.log("without dedup:", JSON.stringify(scenario({ noDedup: true })));
