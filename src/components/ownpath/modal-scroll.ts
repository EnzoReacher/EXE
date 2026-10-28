"use client";
import { useEffect } from "react";
let locks = 0;
let previous = "";
/** Shared by workspace modal layers; one layer cannot unlock another. */
export function useModalScroll(open: boolean) {
  useEffect(() => {
    if (!open) return;
    if (locks++ === 0) { previous = document.body.style.overflow; document.body.style.overflow = "hidden"; }
    return () => { if (--locks === 0) document.body.style.overflow = previous; };
  }, [open]);
}
