import type { BrowserContext, Page } from "@playwright/test";
import { expect, test } from "./support/no-egress";
import { distinctAddress, newEnrolmentCode, serverUrl } from "./server-harness";
import { toBase64Url } from "../src/protocol/identity";
import { makeDeviceKey } from "../server/test/keys";

const ENROLMENTS = 5;

async function openPage(context: BrowserContext): Promise<Page> {
  const page = await context.newPage();
  await page.addInitScript(() => {
    const seen: string[] = [];
    (window as unknown as { csp: string[] }).csp = seen;
    document.addEventListener("securitypolicyviolation", (event) => seen.push(`${event.violatedDirective} ${event.blockedURI}`));
  });
  await page.goto("/en");
  return page;
}

const violations = (page: Page) => page.evaluate(() => (window as unknown as { csp: string[] }).csp);

function post(page: Page, url: string, path: string, body: unknown) {
  return page.evaluate(
    async ({ url, path, body }) => {
      const res = await fetch(`${url}${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      return { status: res.status, body: (await res.json().catch(() => null)) as Record<string, string> | null };
    },
    { url, path, body },
  );
}

async function enrol(page: Page): Promise<number> {
  const key = makeDeviceKey();
  const url = serverUrl();
  const challenge = await post(page, url, "/v1/auth/challenges", { purpose: "register", keyThumbprint: key.thumbprint });
  if (challenge.status !== 200 || !challenge.body) return challenge.status;
  const registered = await post(page, url, "/v1/identities", {
    challengeId: challenge.body["challengeId"],
    signature: key.sign(challenge.body["signingInput"] ?? ""),
    publicKey: toBase64Url(key.spki),
    displayName: "Ada",
    enrollmentCode: newEnrolmentCode().code,
  });
  return registered.status;
}

test("the server answers the web origin with its exact origin and no CSP violation", async ({ browser, baseURL }) => {
  const context = await browser.newContext();
  await distinctAddress(context);
  const page = await openPage(context);
  const [response] = await Promise.all([
    page.waitForResponse((res) => res.url() === `${serverUrl()}/v1/server`),
    page.evaluate((url) => fetch(`${url}/v1/server`), serverUrl()),
  ]);

  expect(response.status()).toBe(200);
  expect(await response.headerValue("access-control-allow-origin")).toBe(baseURL);
  expect(await violations(page)).toEqual([]);
  await context.close();
});

test("two contexts each enrol five times in a minute without a 429", async ({ browser }) => {
  const contexts = await Promise.all([browser.newContext(), browser.newContext()]);
  const pages: Page[] = [];
  for (const context of contexts) {
    await distinctAddress(context);
    pages.push(await openPage(context));
  }

  const statuses = await Promise.all(
    pages.map(async (page) => {
      const results: number[] = [];
      for (let i = 0; i < ENROLMENTS; i += 1) results.push(await enrol(page));
      return results;
    }),
  );

  expect(statuses).toEqual([Array(ENROLMENTS).fill(201), Array(ENROLMENTS).fill(201)]);
  await Promise.all(contexts.map((context) => context.close()));
});
