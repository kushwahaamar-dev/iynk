#!/usr/bin/env node
import { run } from "../src/cli/commands.ts";

process.exitCode = await run(process.argv.slice(2), process.env, {
  out: (line) => void process.stdout.write(`${line}\n`),
  err: (line) => void process.stderr.write(`${line}\n`),
  now: () => Date.now(),
});
