import type { Page } from "@playwright/test";

// The saved state hash of a project, read from the `projects` store of the `iynk` database.
export function readSavedHash(page: Page, projectId: string): Promise<string | null> {
  return page.evaluate(
    (id) =>
      new Promise<string | null>((resolve, reject) => {
        const open = indexedDB.open("iynk");
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const get = db.transaction("projects", "readonly").objectStore("projects").get(id);
          get.onerror = () => reject(get.error);
          get.onsuccess = () => {
            db.close();
            const row = get.result as { hash?: string } | undefined;
            resolve(row?.hash ?? null);
          };
        };
      }),
    projectId,
  );
}
