"use client";

import { useEffect, type RefObject } from "react";

/** Cmd/Ctrl + Enter submits the nearest form from a textarea ref. */
export function useSubmitShortcut(
  ref: RefObject<HTMLTextAreaElement | null>,
  onSubmit: () => void,
  enabled = true,
) {
  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Enter" || !(e.metaKey || e.ctrlKey)) return;
      e.preventDefault();
      onSubmit();
    }

    el.addEventListener("keydown", onKeyDown);
    return () => el.removeEventListener("keydown", onKeyDown);
  }, [ref, onSubmit, enabled]);
}
