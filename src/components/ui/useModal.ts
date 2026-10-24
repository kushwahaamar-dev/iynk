"use client";

import { useEffect, useRef, useSyncExternalStore, type KeyboardEvent, type RefObject } from "react";

const FOCUSABLE =
  'a[href], area[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), iframe, [contenteditable="true"], [tabindex]:not([tabindex="-1"])';

export function focusableIn(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => !el.closest("[hidden], [inert]"));
}

const noop = () => () => {};

/** False during the server render and hydration, true after. */
export function useIsClient(): boolean {
  return useSyncExternalStore(noop, () => true, () => false);
}

/**
 * Modal behaviour for a portal rendered into <body>: everything else becomes
 * inert, focus moves inside and is trapped there, Escape closes, page scroll is
 * locked, and focus goes back to where it was when the modal closes.
 */
export function useModal(open: boolean, layerRef: RefObject<HTMLElement | null>, panelRef: RefObject<HTMLElement | null>, onClose: () => void) {
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });

  useEffect(() => {
    const layer = layerRef.current;
    const panel = panelRef.current;
    if (!open || !layer || !panel) return;

    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const madeInert: Element[] = [];
    for (const el of Array.from(document.body.children)) {
      if (el !== layer && !el.hasAttribute("inert")) {
        el.setAttribute("inert", "");
        madeInert.push(el);
      }
    }
    const root = document.documentElement;
    const overflow = root.style.overflow;
    root.style.overflow = "hidden";

    const preferred = panel.querySelector<HTMLElement>("[data-autofocus]");
    (preferred ?? focusableIn(panel)[0] ?? panel).focus();

    return () => {
      for (const el of madeInert) el.removeAttribute("inert");
      root.style.overflow = overflow;
      if (previous && previous.isConnected) previous.focus();
    };
  }, [open, layerRef, panelRef]);

  return function onKeyDown(event: KeyboardEvent<HTMLElement>) {
    const panel = panelRef.current;
    if (!panel) return;
    if (event.key === "Escape") {
      event.stopPropagation();
      closeRef.current();
      return;
    }
    if (event.key !== "Tab") return;
    const items = focusableIn(panel);
    if (items.length === 0) {
      event.preventDefault();
      panel.focus();
      return;
    }
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;
    if (event.shiftKey && (active === first || active === panel)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  };
}
