"use client";

import { Fragment, useState } from "react";
import { Button, Chip, CodeBlock, Dialog, Icon, type CodeLang } from "@/components/ui";
import { displayLink, type SeenUrls } from "@/ai/render/links";
import { parseMarkdown, type Inline } from "@/ai/render/markdown";

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

type PolicyLabels = {
  confirmTitle: string;
  confirmBody: string;
  confirm: string;
  cancel: string;
  close: string;
  unverified: string;
};

/** What the reply may link to and point at; without it every link and reference is plain text. */
export type RenderPolicy = {
  seenUrls: Pick<SeenUrls, "has">;
  /** The label of a reference that exists in the open document, or null. */
  resolveRef(raw: string): string | null;
  onHighlight(raw: string): void;
  labels: PolicyLabels;
};

type Env = { policy: RenderPolicy | undefined; askLink(url: string): void };

function Inlines({ nodes, env }: { nodes: Inline[]; env: Env }) {
  return nodes.map((node, i) => {
    switch (node.t) {
      case "text":
        return <Fragment key={i}>{node.v}</Fragment>;
      case "bold":
        return (
          <strong key={i} className="font-bold">
            <Inlines nodes={node.c} env={env} />
          </strong>
        );
      case "code":
        return (
          <code key={i} className="rounded-sm bg-sunken px-1 font-mono">
            {node.v}
          </code>
        );
      case "link":
        return (
          <a
            key={i}
            href={node.href}
            rel="noopener noreferrer"
            onClick={(event) => {
              event.preventDefault();
              env.askLink(node.href);
            }}
            className="font-semibold text-ink underline decoration-accent decoration-2 underline-offset-2 hover:decoration-ink"
          >
            <Inlines nodes={node.c} env={env} />
            <span className="ms-1 inline-flex items-center gap-1 rounded-sm bg-sunken px-1 text-xs font-medium text-muted no-underline">
              <Icon name="external" size={16} />
              {displayLink(node.href).domain}
            </span>
          </a>
        );
      case "ref": {
        const policy = env.policy;
        if (!policy) return <Fragment key={i}>{`[[${node.raw}]]`}</Fragment>;
        const label = policy.resolveRef(node.raw);
        if (label === null) {
          return (
            <Chip key={i} tone="warn" className="align-baseline">
              <Icon name="warn" size={16} />
              {policy.labels.unverified}
              <span className="sr-only">: {node.raw}</span>
            </Chip>
          );
        }
        return (
          <button
            key={i}
            type="button"
            onClick={() => policy.onHighlight(node.raw)}
            className="rounded-md bg-info-bg px-2 py-0.5 align-baseline text-xs font-semibold text-info hover:bg-hover"
          >
            {label}
          </button>
        );
      }
    }
  });
}

/** The partner's reply, rendered from the Markdown subset as plain elements. Images and HTML never render. */
export function Markdown({ text, labels, policy }: { text: string; labels: Labels; policy?: RenderPolicy }) {
  const [pending, setPending] = useState<string | null>(null);
  const env: Env = { policy, askLink: setPending };
  const blocks = parseMarkdown(text, { allowUrl: (url) => policy?.seenUrls.has(url) ?? false });
  return (
    <div className="space-y-2 break-words">
      {policy ? (
        <Dialog
          open={pending !== null}
          onClose={() => setPending(null)}
          title={policy.labels.confirmTitle}
          description={policy.labels.confirmBody}
          closeLabel={policy.labels.close}
          size="sm"
          footer={
            <>
              <Button variant="ghost" onClick={() => setPending(null)}>
                {policy.labels.cancel}
              </Button>
              <Button
                variant="primary"
                data-autofocus
                onClick={() => {
                  if (pending) window.open(pending, "_blank", "noopener,noreferrer");
                  setPending(null);
                }}
              >
                {policy.labels.confirm}
              </Button>
            </>
          }
        >
          <p className="break-all font-mono text-sm">{pending ? displayLink(pending).full : null}</p>
        </Dialog>
      ) : null}
      {blocks.map((block, i) => {
        switch (block.t) {
          case "p":
            return (
              <p key={i}>
                {block.lines.map((line, j) => (
                  <Fragment key={j}>
                    {j > 0 ? <br /> : null}
                    <Inlines nodes={line} env={env} />
                  </Fragment>
                ))}
              </p>
            );
          case "h":
            return (
              <p key={i} className="font-bold">
                <Inlines nodes={block.c} env={env} />
              </p>
            );
          case "ul":
            return (
              <ul key={i} className="list-disc space-y-1 ps-4 marker:text-muted">
                {block.items.map((item, j) => (
                  <li key={j}>
                    <Inlines nodes={item} env={env} />
                  </li>
                ))}
              </ul>
            );
          case "ol":
            return (
              <ol key={i} start={block.start} className="list-decimal space-y-1 ps-4 tabular marker:font-semibold marker:text-muted">
                {block.items.map((item, j) => (
                  <li key={j}>
                    <Inlines nodes={item} env={env} />
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
