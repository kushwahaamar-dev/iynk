import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import * as editorial from "./Editorial";

const { Note, PageHead, Section } = editorial;

describe("Editorial", () => {
  it("caps the page head title at 680px", () => {
    const html = renderToStaticMarkup(<PageHead title="About" />);
    expect(html).toMatch(/<h1 class="[^"]*max-w-\[680px\]/);
  });

  it("labels a section by its heading", () => {
    const html = renderToStaticMarkup(
      <Section id="s1" title="Why">
        text
      </Section>,
    );
    expect(html).toContain('<section aria-labelledby="s1"');
    expect(html).toContain('<h2 id="s1"');
  });

  it("draws a note without a one sided border", () => {
    const html = renderToStaticMarkup(<Note title="Nothing yet" />);
    expect(html).not.toContain("border-s");
  });
});
