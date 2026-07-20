"use client";

import { useSyncExternalStore } from "react";

export type RepostState = { mine: boolean; count: number };

// One post can render several times on a page -- as its own timeline item, as
// the body of an "X reposted" wrapper, and embedded inside a quote card -- and
// each copy renders its own ReactionRow. Local useState per row meant those
// copies disagreed the moment you clicked one: the button looked pressed in one
// place and unpressed in another. Keyed by post id so a toggle updates all of
// them at once.
//
// Memory-only and per-tab: a fresh server render seeds `initial`, and this
// store only takes over for ids the viewer has actually toggled this session.
const states = new Map<string, RepostState>();
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function setRepostState(postId: string, next: RepostState) {
  states.set(postId, next);
  for (const listener of listeners) listener();
}

export function useRepostState(postId: string, initial: RepostState): RepostState {
  // getSnapshot returns the stored object by reference (or undefined), never a
  // fresh literal -- React re-renders forever otherwise.
  const shared = useSyncExternalStore(
    subscribe,
    () => states.get(postId),
    () => undefined,
  );
  return shared ?? initial;
}
