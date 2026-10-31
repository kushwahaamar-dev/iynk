import { readSecret } from "@/lib/keys/store";

/** The person's search key for the provider-key header; null when none is set. */
export const readSearchKey = (): string | null => readSecret("search");
