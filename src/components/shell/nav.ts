// The site navigation, in order. The header and the mobile menu both read this
// array, so a new page (the hackathon layer's /together, /passport, /verify)
// is one entry here plus a "nav.<id>" string in every locale's shell.json.

export type NavId = "dashboard" | "boards" | "robotics" | "drones" | "together" | "passport" | "verify" | "about";

export type NavEntry = {
  id: NavId;
  /** Path after the language segment: "" is the dashboard, "/boards" a lab. */
  href: string;
  /** Show in the desktop bar too (the logo already links to the dashboard). */
  bar: boolean;
  feature?: "solana";
};

export const NAV: readonly NavEntry[] = [
  { id: "dashboard", href: "", bar: false },
  { id: "boards", href: "/boards", bar: true },
  { id: "robotics", href: "/robotics", bar: true },
  { id: "drones", href: "/drones", bar: true },
  { id: "together", href: "/together", bar: true },
  { id: "passport", href: "/passport", bar: false, feature: "solana" },
  { id: "verify", href: "/verify", bar: false, feature: "solana" },
  { id: "about", href: "/about", bar: true },
];

/** Whether `pathname` is inside the entry (the dashboard only matches itself). */
export function isActive(entry: NavEntry, lang: string, pathname: string): boolean {
  const target = `/${lang}${entry.href}`;
  if (entry.href === "") return pathname === target || pathname === `${target}/`;
  return pathname === target || pathname.startsWith(`${target}/`);
}
