"use client";

import { useEffect } from "react";
import { registerServiceWorker } from "@/local/sw-register";

/** Registers the offline worker once the page is up. It draws nothing. */
export function SwRegister() {
  useEffect(() => {
    registerServiceWorker({
      nav: navigator,
      buildId: process.env.NEXT_PUBLIC_BUILD_ID ?? "",
      isProd: process.env.NODE_ENV === "production",
      location: window.location,
    }).catch(() => {
      // The page works without a worker.
    });
  }, []);
  return null;
}
