import { pathToFileURL } from "node:url";
import type { OfferPartInput } from "../../../../src/lib/search/schema.ts";
import type { OffersResponse } from "../../../../src/lib/search/types.ts";
import type { Tool } from "./registry.ts";

type CatalogueBundle = {
  searchCatalog: Tool;
  getItem: Tool;
  droneCalc: Tool;
  priceParts: Tool;
  useSearch(search: CatalogueDeps["search"]): void;
};

export type CatalogueDeps = {
  /** Live listings for price_parts. */
  search(requests: OfferPartInput[], signal: AbortSignal): Promise<OffersResponse>;
};

/** Tool calls carry no search key (the server keeps none), so price_parts answers with the catalogue estimates alone. */
export const withoutLivePrices: CatalogueDeps = {
  search: async () => ({ parts: [], fetchedAt: new Date(0).toISOString() }),
};

export const CATALOGUE_BUNDLE = new URL("../../../dist/tools.mjs", import.meta.url);

/** The four catalogue tools from the bundle `server/tools/build.mjs` makes; none when it was not built. */
export async function loadCatalogueTools(bundle: URL | string = CATALOGUE_BUNDLE, deps: CatalogueDeps = withoutLivePrices): Promise<readonly Tool[]> {
  const href = typeof bundle === "string" ? pathToFileURL(bundle).href : bundle.href;
  let loaded: CatalogueBundle;
  try {
    loaded = (await import(href)) as CatalogueBundle;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ERR_MODULE_NOT_FOUND") throw error;
    console.warn("[tools] catalogue tools not built");
    return [];
  }
  loaded.useSearch(deps.search);
  return [loaded.searchCatalog, loaded.getItem, loaded.droneCalc, loaded.priceParts];
}
