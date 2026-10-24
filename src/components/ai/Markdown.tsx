import { Fragment } from "react";
import { CodeBlock, type CodeLang } from "@/components/ui";
import { parseMarkdown, type Inline } from "@/lib/ai/markdown";

const LANGS: Record<string, CodeLang> = {
  cpp: "cpp",
  "c++": "cpp",
  c: "cpp",
  arduino: "cpp",
  ino: "cpp",
  python: "python",
  py: "python",
  micropython: "python",
  verilog: "verilog",
  v: "verilog",
  systemverilog: "verilog",
  bash: "bash",
  sh: "bash",
  shell: "bash",
};

type Labels = { code: string; copy: string; copied: string };

function Inlines({ nodes }: { nodes: Inline[] }) {
  return nodes.map((node, i) => {
    switch (node.t) {
      case "text":
        return <Fragment key={i}>{node.v}</Fragment>;
      case "bold":
        return (
          <strong key={i} className="font-extrabold">
            <Inlines nodes={node.c} />
          </strong>
        );
      case "code":
        return (
          <code key={i} className="rounded-ink-sm border border-rule bg-sunken px-1 py-px font-ui text-[0.85em]">
            {node.v}
          </code>
        );
      case "link":
        return (
          <a
            key={i}
            href={node.href}
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold text-ink underline decoration-cobalt decoration-2 underline-offset-2 hover:decoration-ink"
          >
            <Inlines nodes={node.c} />
          </a>
        );
    }
  });
}

/** The partner's reply, rendered from the Markdown subset as plain elements. */
export function Markdown({ text, labels }: { text: string; labels: Labels }) {
  return (
    <div className="space-y-2 break-words">
      {parseMarkdown(text).map((block, i) => {
        switch (block.t) {
          case "p":
            return (
              <p key={i}>
                {block.lines.map((line, j) => (
                  <Fragment key={j}>
                    {j > 0 ? <br /> : null}
                    <Inlines nodes={line} />
                  </Fragment>
                ))}
              </p>
            );
          case "h":
            return (
              <p key={i} className="font-head font-extrabold">
                <Inlines nodes={block.c} />
              </p>
            );
          case "ul":
            return (
              <ul key={i} className="list-disc space-y-1 ps-5 marker:text-tomato">
                {block.items.map((item, j) => (
                  <li key={j}>
                    <Inlines nodes={item} />
                  </li>
                ))}
              </ul>
            );
          case "ol":
            return (
              <ol key={i} start={block.start} className="list-decimal space-y-1 ps-5 marker:font-ui marker:font-bold">
                {block.items.map((item, j) => (
                  <li key={j}>
                    <Inlines nodes={item} />
                  </li>
                ))}
              </ol>
            );
          case "code":
            return (
              <CodeBlock
                key={i}
                code={block.v}
                lang={LANGS[block.lang] ?? "text"}
                label={labels.code}
                copyLabel={labels.copy}
                copiedLabel={labels.copied}
              />
            );
        }
      })}
    </div>
  );
}
