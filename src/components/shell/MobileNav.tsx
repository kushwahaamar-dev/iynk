"use client";

import Link from "next/link";
import { useEffect, useId, useLayoutEffect, useRef, useState, type ComponentProps } from "react";
import { createPortal } from "react-dom";
import { cx } from "@/components/ui/cx";
import { useIsClient, useModal } from "@/components/ui/useModal";
import type { Locale } from "@/i18n/config";
import { Logo } from "./Logo";
import { MenuIcon } from "./MenuIcon";
import type { NavId } from "./nav";
import { NavLinks } from "./NavLinks";
import { SettingsPanel, type SettingsLabels } from "./SettingsMenu";

type MobileNavProps = {
  lang: Locale;
  labels: {
    home: string;
    nav: Record<NavId, string>;
    menu: string;
    closeMenu: string;
    navLabel: string;
    settings: SettingsLabels;
  };
};

const toggleClass =
  "relative inline-flex size-10 shrink-0 items-center justify-center rounded-lg bg-transparent text-ink motion-fade enabled:hover:bg-hover enabled:active:scale-98 enabled:active:motion-press [@media(pointer:coarse)]:size-11";

function ToggleButton({ open, className, ...rest }: { open: boolean } & Omit<ComponentProps<"button">, "children">) {
  return (
    <button type="button" aria-expanded={open} {...rest} className={cx(toggleClass, className)}>
      <MenuIcon open={open} />
    </button>
  );
}

type PanelProps = MobileNavProps & { id: string; anchor: DOMRect | null; onClose: () => void };

function Panel({ id, lang, labels, anchor, onClose }: PanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const [armed, setArmed] = useState(false);
  const onKeyDown = useModal(true, panelRef, panelRef, onClose);

  useLayoutEffect(() => {
    navRef.current?.querySelector("a")?.setAttribute("data-autofocus", "");
  }, []);

  // The cross is drawn one frame after mounting, so the bars the person tapped visibly turn into it.
  useEffect(() => {
    const frame = requestAnimationFrame(() => setArmed(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  return createPortal(
    <div
      ref={panelRef}
      id={id}
      role="dialog"
      aria-modal="true"
      aria-label={labels.menu}
      tabIndex={-1}
      onKeyDown={onKeyDown}
      className="fixed inset-0 z-overlay flex h-dvh flex-col bg-paper/95 text-ink outline-none backdrop-blur-2xl animate-fade-in"
    >
      <div className="relative mt-2 flex h-12 shrink-0 items-center px-4">
        <Link href={`/${lang}`} onClick={onClose} className="flex min-h-11 items-center rounded-lg px-2 text-ink no-underline motion-fade hover:bg-hover">
          <Logo height={23} />
          <span className="sr-only">{labels.home}</span>
        </Link>
        <ToggleButton
          open={armed}
          aria-label={labels.closeMenu}
          aria-controls={id}
          onClick={onClose}
          className={anchor ? "fixed" : "absolute end-2"}
          style={anchor ? { top: anchor.top, left: anchor.left } : undefined}
        />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-8 pt-4" style={{ paddingBottom: "max(2rem, env(safe-area-inset-bottom))" }}>
        <nav ref={navRef} aria-label={labels.navLabel} className="[&_ul]:divide-y [&_ul]:divide-rule">
          <NavLinks lang={lang} labels={labels.nav} layout="sheet" onNavigate={onClose} />
        </nav>
        <section aria-label={labels.settings.settings} className="mt-8 border-t border-rule pt-8">
          <SettingsPanel lang={lang} labels={labels.settings} />
        </section>
      </div>
    </div>,
    document.body,
  );
}

/** The menu under 1024 px: a full height panel with the labs and every setting. */
export function MobileNav({ lang, labels }: MobileNavProps) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<DOMRect | null>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const isClient = useIsClient();

  return (
    <>
      <ToggleButton
        ref={toggleRef}
        open={open}
        aria-label={open ? labels.closeMenu : labels.menu}
        aria-controls={open ? id : undefined}
        aria-haspopup="dialog"
        onClick={() => {
          setAnchor(toggleRef.current?.getBoundingClientRect() ?? null);
          setOpen(true);
        }}
        className="-me-2"
      />
      {open && isClient ? <Panel id={id} lang={lang} labels={labels} anchor={anchor} onClose={() => setOpen(false)} /> : null}
    </>
  );
}
