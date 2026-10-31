// Bundles the four catalogue tools of the site (src/lib/server/mcp/tools) into dist/tools.mjs so the
// server can run them under plain Node. The site's Next-only imports are swapped for small stand-ins here.
import { build } from "esbuild";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../", import.meta.url));
const server = fileURLToPath(new URL("../", import.meta.url));
const toolsDir = `${root}src/lib/server/mcp/tools/`;

// The registry, the tool errors and the search errors must be the server's own modules, or `instanceof`
// and the one registry would not see the bundle's tools. dist/ sits next to src/, so these paths hold at run time.
const SERVER_MODULES = {
  registry: "../src/modules/tools/registry.ts",
  searchErrors: "../src/modules/search/serpapi.ts",
};

const STAND_INS = {
  "server-only": "",
  react: "export const cache = (fn) => fn;",
  "@/lib/server/env": "export const features = { search: true };",
  "@/lib/server/http": "export const withTimeout = (ms) => AbortSignal.timeout(ms);",
  "@/lib/server/search/serpapi": `
    export { SearchError } from ${JSON.stringify(SERVER_MODULES.searchErrors)};
    let search;
    export const useSearch = (fn) => { search = fn; };
    export const offers = (requests, signal) => search(requests, signal);
  `,
};

const standIns = {
  name: "stand-ins",
  setup(b) {
    b.onResolve({ filter: /^(server-only|react|@\/lib\/server\/(env|http|search\/serpapi))$/ }, (args) => ({ path: args.path, namespace: "stand-in" }));
    b.onLoad({ filter: /.*/, namespace: "stand-in" }, (args) => ({ contents: STAND_INS[args.path], resolveDir: server }));
    b.onResolve({ filter: /^\.\.\/registry$/ }, () => ({ path: SERVER_MODULES.registry, external: true }));
    b.onResolve({ filter: /^\.\.\/src\/modules\// }, (args) => ({ path: args.path, external: true }));
    b.onResolve({ filter: /^zod$/ }, () => ({ path: "zod", external: true }));
  },
};

const entry = `
  export { searchCatalog, getItem } from ${JSON.stringify(`${toolsDir}catalog.ts`)};
  export { droneCalc } from ${JSON.stringify(`${toolsDir}drone.ts`)};
  export { priceParts } from ${JSON.stringify(`${toolsDir}market.ts`)};
  export { useSearch } from "@/lib/server/search/serpapi";
`;

await build({
  stdin: { contents: entry, resolveDir: root, loader: "ts" },
  outfile: `${server}dist/tools.mjs`,
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node24",
  alias: { "@": `${root}src` },
  external: ["node:*"],
  plugins: [standIns],
  logLevel: "warning",
});
