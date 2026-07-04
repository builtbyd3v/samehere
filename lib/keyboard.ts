/** True on macOS, iOS, iPadOS — use ⌘ for shortcuts, not Ctrl. */
export function isMacOS(): boolean {
  if (typeof navigator === "undefined") return false;
  const p = navigator.platform;
  return /Mac|iPhone|iPad|iPod/.test(p) || (p === "MacIntel" && navigator.maxTouchPoints > 1);
}

/** Enter + the platform-appropriate modifier (⌘ on Mac, Ctrl elsewhere). */
export function isSubmitShortcut(e: { key: string; metaKey: boolean; ctrlKey: boolean }): boolean {
  if (e.key !== "Enter") return false;
  return isMacOS() ? e.metaKey && !e.ctrlKey : e.ctrlKey && !e.metaKey;
}

export function submitShortcutLabel(): string {
  return isMacOS() ? "⌘ + Enter" : "Ctrl + Enter";
}
