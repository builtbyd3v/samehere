"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Check, Share2 } from "lucide-react";
import { ICON_SPRING } from "@/lib/motion/spring";
import { profileShareUrl } from "@/lib/portfolio/share";

export default function SharePortfolioButton({
  username,
  displayName,
}: {
  username: string;
  displayName: string;
}) {
  const [copied, setCopied] = useState(false);
  const reduceMotion = useReducedMotion();
  const url = profileShareUrl(username);

  async function share() {
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({ title: `${displayName} on samehere`, url, text: `@${username}` });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={share}
      className={`btn-ghost inline-flex items-center gap-1.5 !rounded-full !px-4 !py-1.5 text-sm${copied ? " share-copied" : ""}`}
    >
      <motion.span
        key={copied ? "copied" : "share"}
        className="inline-flex"
        initial={reduceMotion ? false : { scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={reduceMotion ? { duration: 0.15 } : ICON_SPRING}
      >
        {copied ? <Check strokeWidth={1.5} className="h-4 w-4" /> : <Share2 strokeWidth={1.5} className="h-4 w-4" />}
      </motion.span>
      {copied ? "Copied" : "Share"}
    </button>
  );
}
