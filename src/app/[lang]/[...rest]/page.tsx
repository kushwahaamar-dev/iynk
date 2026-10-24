import { notFound } from "next/navigation";

// Any URL under a language that no route matches gets [lang]/not-found.tsx
// inside the localized layout, instead of Next's unstyled English 404.
// Cache Components needs at least one static param, hence the single entry.
export function generateStaticParams() {
  return [{ rest: ["not-found"] }];
}

export default function CatchAll() {
  notFound();
}
