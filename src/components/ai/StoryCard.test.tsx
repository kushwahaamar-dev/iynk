import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import en from "@/i18n/messages/en/ai.json";
import { createTranslator } from "@/i18n/translate";
import { SessionLog } from "@/lib/ai/session-log";
import { StoryCard } from "./StoryCard";

const t = createTranslator("en", en);

afterEach(() => vi.unstubAllGlobals());

function logWithHelp() {
  const log = new SessionLog();
  log.setSelf("Sam");
  log.add("Sam", "fault", "LED is in backwards");
  log.add("Sam", "help", "the partner asked Ana to explain: which leg is +?", "Ana");
  log.add("Sam", "pass", "passed blink");
  return log;
}

describe("StoryCard", () => {
  test("writes the story, draws the cover and credits who helped whom", async () => {
    const calls: Array<[string, unknown]> = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        calls.push([url, JSON.parse(init!.body as string)]);
        if (url === "/api/ai/story") {
          return Response.json({ title: "The LED that would not blink", story: "Sam flipped the **LED**.", highlights: ["First blink"], imagePrompt: "an LED on a breadboard" });
        }
        return Response.json({ image: "data:image/png;base64,iVBORw0KGgo=" });
      }),
    );
    const open = vi.fn();
    vi.stubGlobal("open", open);
    render(<StoryCard lab="board" itemId="uno-r3" log={logWithHelp()} t={t} locale="en" image />);

    expect(screen.getByText("3 moments so far")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Write our Build Story" }));
    expect(await screen.findByRole("img", { name: "Cover illustration for “The LED that would not blink”" })).toBeTruthy();
    expect(screen.getByText("Ana helped Sam")).toBeTruthy();
    expect(screen.getByText("First blink")).toBeTruthy();

    const [storyUrl, storyBody] = calls[0] as [string, { events: unknown[]; peers: unknown[] }];
    expect(storyUrl).toBe("/api/ai/story");
    expect(storyBody.events).toHaveLength(3);
    expect(storyBody.peers).toEqual([{ name: "Sam", lang: "en" }]);
    expect(calls[1]).toEqual(["/api/ai/image", { prompt: "an LED on a breadboard", style: "colorfigures" }]);

    fireEvent.click(screen.getByRole("button", { name: "Share on Facebook" }));
    expect(open).toHaveBeenCalledWith(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href.split("#")[0])}`,
      "_blank",
      "noopener,noreferrer,width=640,height=600",
    );
  });

  test("keeps the story when the cover fails, and says so", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) =>
        url === "/api/ai/story"
          ? Response.json({ title: "Night build", story: "We built it.", highlights: [], imagePrompt: "a drone" })
          : Response.json({ error: { code: "upstream_failed", message: "x" } }, { status: 502 }),
      ),
    );
    render(<StoryCard lab="drone" itemId="quad5" log={logWithHelp()} t={t} locale="en" image />);
    fireEvent.click(screen.getByRole("button", { name: "Write our Build Story" }));
    expect(await screen.findByText("The cover couldn’t be drawn this time, so the story has none.")).toBeTruthy();
    expect(screen.getByText("Night build")).toBeTruthy();
  });

  test("an empty session explains what to do first", () => {
    render(<StoryCard lab="robotics" itemId="arm" log={new SessionLog()} t={t} locale="en" image={false} />);
    expect(screen.getByText(en.story.empty)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Write our Build Story" })).toBeNull();
  });
});
