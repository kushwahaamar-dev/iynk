import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// The keyless web environment blanks this; the server refuses it even when empty.
delete process.env.IYNK_SERVER_TOKEN;

const dataDir = process.env.E2E_SERVER_DATA;
mkdirSync(dataDir, { recursive: true, mode: 0o700 });
writeFileSync(join(dataDir, "pid"), String(process.pid));
await import("../server/src/main.ts");
