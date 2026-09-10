"use client";

import { useState } from "react";
import { Check } from "lucide-react";

// Source: https://www.beautifului.dev/ — ApprovalCard option rows + custom
// field adapted for an example draft. Local preview only; no backend save.

export default function DraftApproval({
  role,
  onRoleChange,
}: {
  role: string;
  onRoleChange: (value: string) => void;
}) {
  const [editing, setEditing] = useState(false);

  return (
    <div className="landing-draft-approval">
      <p className="landing-draft-approval-kicker">Example</p>
      <p className="landing-draft-approval-q">Private draft</p>
      <p className="landing-draft-approval-status">
        Only you can see this until you share it.
      </p>

      {editing ? (
        <label className="landing-draft-approval-field">
          <span>Your role on this project</span>
          <input
            value={role}
            onChange={(event) => onRoleChange(event.target.value)}
            aria-label="Your role on this project"
          />
        </label>
      ) : (
        <button
          type="button"
          className="landing-draft-approval-option"
          onClick={() => setEditing(true)}
        >
          <span className="landing-draft-approval-dot" />
          <span>Edit preview</span>
        </button>
      )}

      {editing ? (
        <button
          type="button"
          className="landing-draft-approval-done"
          onClick={() => setEditing(false)}
        >
          <span className="landing-draft-approval-dot" data-on="true">
            <Check size={12} strokeWidth={2.5} aria-hidden />
          </span>
          Done editing
        </button>
      ) : (
        <p className="landing-draft-approval-note">Example only. Nothing is saved.</p>
      )}
    </div>
  );
}
