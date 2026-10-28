"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

/** Dispatched on window by anything that wants the keys dialog open (the Settings button, a "not set up" box). */
export const OPEN_KEYS_EVENT = "iynk:open-keys";

const KeysDialogContent = dynamic(() => import("./KeysDialogContent").then((m) => m.KeysDialogContent));

/** The panel code loads the first time the dialog opens; the error log it shows is filled from page load. */
export function KeysDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [wasOpened, setWasOpened] = useState(open);
  if (open && !wasOpened) setWasOpened(true);
  // The dialog is rendered on every page, so errors are caught from page load, not from the first time it opens.
  useEffect(() => {
    let stop: (() => void) | undefined;
    let unmounted = false;
    void import("@/lib/telemetry").then(({ installErrorCapture }) => {
      if (!unmounted) stop = installErrorCapture();
    });
    return () => {
      unmounted = true;
      stop?.();
    };
  }, []);
  return wasOpened ? <KeysDialogContent open={open} onClose={onClose} /> : null;
}
