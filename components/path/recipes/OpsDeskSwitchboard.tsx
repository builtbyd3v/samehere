"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { SegmentedControl } from "@/components/interior/SegmentedControl";
import type {
  ApplicationStageCount,
  OpportunityListing,
} from "@/lib/path/load-opportunities";
import { ApplicationsStub, OpportunitiesStub } from "../modules/stubs";

const VIEWS = [
  { value: "pipeline", label: "Pipeline" },
  { value: "matches", label: "Matches" },
];

export default function OpsDeskSwitchboard({
  applicationStages,
  listings,
}: {
  applicationStages?: ApplicationStageCount[];
  listings?: OpportunityListing[];
}) {
  const [view, setView] = useState("pipeline");
  const reduced = useReducedMotion();

  return (
    <section className="path-ops-switchboard" aria-label="Application desk view">
      <div className="path-switchboard-header">
        <div>
          <h2>Work queue</h2>
          <p>Switch between pipeline pressure and the roles worth acting on.</p>
        </div>
        <SegmentedControl
          label="Application desk view"
          options={VIEWS}
          value={view}
          onValueChange={setView}
        />
      </div>

      <AnimatePresence initial={false} mode="wait">
        <motion.div
          key={view}
          initial={reduced ? { opacity: 0 } : { opacity: 0, x: view === "pipeline" ? -8 : 8 }}
          animate={{ opacity: 1, x: 0 }}
          exit={reduced ? { opacity: 0 } : { opacity: 0, x: view === "pipeline" ? 8 : -8 }}
          transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 300, damping: 32 }}
        >
          {view === "pipeline" ? (
            <ApplicationsStub stages={applicationStages} />
          ) : (
            <OpportunitiesStub listings={listings} />
          )}
        </motion.div>
      </AnimatePresence>
    </section>
  );
}
