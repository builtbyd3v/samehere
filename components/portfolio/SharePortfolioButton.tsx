"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Check, Share2 } from "lucide-react";
import posthog from "posthog-js";
import { Button, type ButtonShape } from "@/components/ui/Button";
import { ICON_SPRING } from "@/lib/motion/spring";
import { profileShareUrl } from "@/lib/portfolio/share";

export default function SharePortfolioButton({
  username,
  displayName,
  shape = "pill",
  fullWidth = false,
}: {
  username: string;
  displayName: string;
  shape?: ButtonShape;
  fullWidth?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const reduceMotion = useReducedMotion();
  const url = profileShareUrl(username, username);

  async function share() {
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({ title: `${displayName} on samehere`, url, text: `@${username}` });
        posthog.capture("portfolio_shared", { method: "native" });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      posthog.capture("portfolio_shared", { method: "copy" });
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Button
      variant="secondary"
      size="md"
      shape={shape}
      onClick={share}
      className={`${fullWidth ? "w-full" : ""}${copied ? " share-copied" : ""}`.trim()}
    >
      <motion.span
        key={copied ? "copied" : "share"}
        className="inline-flex"
        initial={copied && !reduceMotion ? { scale: 0.8, opacity: 0 } : false}
        animate={{ scale: 1, opacity: 1 }}
        transition={reduceMotion ? { duration: 0.15 } : ICON_SPRING}
      >
        {copied ? <Check strokeWidth={1.5} className="h-4 w-4" /> : <Share2 strokeWidth={1.5} className="h-4 w-4" />}
      </motion.span>
      {copied ? "Copied" : "Share"}
    </Button>
  );
}
