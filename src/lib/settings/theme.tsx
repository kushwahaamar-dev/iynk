"use client";

import { useLayoutEffect } from "react";
import { STORAGE_KEY } from "@/lib/progress/storage";
import { useSettings } from "./hooks";
import { applySettingsToDocument } from "./settings";

// Runs while the HTML is parsed, before first paint, so a saved dark theme
// never flashes light and a first visit is light even on a dark OS. Mirrors
// applySettingsToDocument with DEFAULT_SETTINGS.theme for nothing saved.
const BOOT = `(function(){var d=document.documentElement;d.dataset.theme="light";try{var s=JSON.parse(localStorage.getItem(${JSON.stringify(STORAGE_KEY)})||"{}").settings||{};if(s.theme==="dark")d.dataset.theme="dark";else if(s.theme==="system")delete d.dataset.theme;if(s.reduceMotion===true)d.dataset.reduceMotion="true"}catch(e){}})()`;

/**
 * The boot script for <head>. It has to be a Client Component: when a soft
 * navigation mounts another language's layout, React builds this element in
 * the browser, where a JavaScript <script> would never run and would draw a
 * warning, so the client render makes it an inert text/plain block.
 */
export function SettingsBootScript() {
  const onServer = typeof window === "undefined";
  return (
    <script
      type={onServer ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: BOOT }}
    />
  );
}

/**
 * Keeps <html> in step with the settings. A soft switch to another language
 * mounts a new root layout and React resets <html> to the attributes it
 * renders, so this puts them back before paint, and again on every change.
 */
export function SettingsSync() {
  const settings = useSettings();
  useLayoutEffect(() => {
    applySettingsToDocument(settings);
  }, [settings]);
  return null;
}
