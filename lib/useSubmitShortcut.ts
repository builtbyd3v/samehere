"use client";

import { useEffect, type RefObject } from "react";
import { isSubmitShortcut } from "@/lib/keyboard";

/** Platform submit shortcut: ⌘+Enter on Mac, Ctrl+Enter elsewhere. */
export function useSubmitShortcut(
  ref: RefObject<HTMLTextAreaElement | null>,
  onSubmit: () => void,
  enabled = true,
) {
  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;

    function onKeyDown(e: KeyboardEvent) {
      if (!isSubmitShortcut(e)) return;
      e.preventDefault();
      onSubmit();
    }

    el.addEventListener("keydown", onKeyDown);
    return () => el.removeEventListener("keydown", onKeyDown);
  }, [ref, onSubmit, enabled]);
}
