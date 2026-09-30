"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { ImageDown, TriangleAlert } from "lucide-react";
import posthog from "posthog-js";
import Menu from "@/components/ui/Menu";
import { ICON_SPRING } from "@/lib/motion/spring";
import { menuItemClass } from "@/lib/ui/menu-styles";
import { CARD_FORMATS, CARD_SIZES, cardFilename, cardPath, type CardFormat } from "@/lib/portfolio/card-format";

const LABEL: Record<CardFormat, string> = { landscape: "Landscape", square: "Square", story: "Story" };

type ExportPortfolioButtonProps = { username: string };

export default function ExportPortfolioButton({ username }: ExportPortfolioButtonProps) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const reduceMotion = useReducedMotion();

  async function exportAs(format: CardFormat) {
    setOpen(false);
    setBusy(true);
    setFailed(false);
    try {
      const res = await fetch(cardPath(username, format));
      if (!res.ok) throw new Error(`card ${res.status}`);
      const file = new File([await res.blob()], cardFilename(username, format), { type: "image/png" });
      // Share sheet only on touch devices: desktop share sheets usually cannot save a file.
      if (window.matchMedia("(pointer: coarse)").matches && navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file] });
          posthog.capture("portfolio_image_exported", { format, method: "share" });
          return;
        } catch (error) {
          if (error instanceof DOMException && error.name === "AbortError") return;
          // NotAllowedError etc: fall through to download.
        }
      }
      const url = URL.createObjectURL(file);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name;
      a.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      posthog.capture("portfolio_image_exported", { format, method: "download" });
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Menu
      customTrigger
      open={open}
      onOpenChange={setOpen}
      align="end"
      trigger={
        <button
          type="button"
          disabled={busy}
          onClick={() => setOpen(!open)}
          aria-label="Export portfolio image"
          className="btn-ghost inline-flex items-center gap-1.5 !rounded-full !px-4 !py-1.5 text-sm disabled:opacity-60"
        >
          <motion.span
            key={failed ? "failed" : "export"}
            className="inline-flex"
            initial={reduceMotion ? false : { scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={reduceMotion ? { duration: 0.15 } : ICON_SPRING}
          >
            {failed ? (
              <TriangleAlert strokeWidth={1.5} className="h-4 w-4" />
            ) : (
              <ImageDown strokeWidth={1.5} className="h-4 w-4" />
            )}
          </motion.span>
          {busy ? "Exporting" : failed ? "Try again" : "Export"}
        </button>
      }
    >
      {CARD_FORMATS.map((f) => (
        <button key={f} type="button" role="menuitem" className={menuItemClass} onClick={() => exportAs(f)}>
          {LABEL[f]}{" "}
          <span className="text-[var(--ink-faint)]">{`${CARD_SIZES[f].width}x${CARD_SIZES[f].height}`}</span>
        </button>
      ))}
    </Menu>
  );
}
