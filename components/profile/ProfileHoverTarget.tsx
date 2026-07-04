"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { createClient } from "@/lib/supabase/client";
import { fetchProfilePreview, type ProfilePreview } from "@/lib/profile-preview";
import ProfilePreviewCard from "./ProfilePreviewCard";

const SHOW_MS = 400;
const HIDE_MS = 200;
const BRIDGE_PX = 12;

export default function ProfileHoverTarget({
  username,
  children,
}: {
  username: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState<ProfilePreview | null>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const anchorRef = useRef<HTMLSpanElement>(null);
  const showTimer = useRef<number | undefined>(undefined);
  const hideTimer = useRef<number | undefined>(undefined);
  const [supabase] = useState(createClient);

  const place = useCallback(() => {
    const rect = anchorRef.current?.getBoundingClientRect();
    if (!rect) return;
    const width = 300;
    const left = Math.min(Math.max(8, rect.left), window.innerWidth - width - 8);
    setPos({ top: rect.bottom + 8, left });
  }, []);

  const openPreview = useCallback(async () => {
    place();
    const data = await fetchProfilePreview(supabase, username);
    if (data) {
      setProfile(data);
      setOpen(true);
    }
  }, [place, supabase, username]);

  function scheduleShow() {
    clearTimeout(hideTimer.current);
    showTimer.current = window.setTimeout(() => void openPreview(), SHOW_MS);
  }

  function scheduleHide() {
    clearTimeout(showTimer.current);
    hideTimer.current = window.setTimeout(() => {
      setOpen(false);
      setProfile(null);
    }, HIDE_MS);
  }

  function cancelHide() {
    clearTimeout(hideTimer.current);
  }

  useEffect(() => {
    return () => {
      clearTimeout(showTimer.current);
      clearTimeout(hideTimer.current);
    };
  }, []);

  return (
    <>
      <span
        ref={anchorRef}
        className="inline"
        onMouseEnter={scheduleShow}
        onMouseLeave={scheduleHide}
        onFocus={scheduleShow}
        onBlur={scheduleHide}
      >
        {children}
      </span>

      {open &&
        profile &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed z-[60]"
            style={{ top: pos.top - BRIDGE_PX, left: pos.left, paddingTop: BRIDGE_PX }}
            onMouseEnter={cancelHide}
            onMouseLeave={scheduleHide}
          >
            <ProfilePreviewCard profile={profile} popover />
          </div>,
          document.body,
        )}
    </>
  );
}
