import { z } from "zod";

// Next loads this file before any page code. zod otherwise probes `new Function` when it builds an
// object schema, which the page CSP (no 'unsafe-eval') reports as a violation even though the probe is caught.
z.config({ jitless: true });
