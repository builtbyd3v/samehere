"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { activeMentionAt } from "@/lib/mentions";
import { searchMentionUsers, type MentionSuggestion } from "@/lib/profile-preview";
import MentionSuggestionList from "@/components/profile/MentionSuggestionList";

type Props = {
  value: string;
  onChange: (value: string) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  rows?: number;
  name?: string;
  required?: boolean;
  maxLength?: number;
  placeholder?: string;
  className?: string;
};

export default function MentionTextarea({
  value,
  onChange,
  textareaRef,
  rows = 4,
  name,
  required,
  maxLength,
  placeholder,
  className,
}: Props) {
  const [supabase] = useState(createClient);
  const [suggestions, setSuggestions] = useState<MentionSuggestion[]>([]);
  const [range, setRange] = useState<{ start: number; end: number } | null>(null);
  const [highlight, setHighlight] = useState(0);
  const debounceRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el || !range) {
      setSuggestions([]);
      return;
    }

    clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(async () => {
      const query = value.slice(range.start + 1, range.end);
      const results = await searchMentionUsers(supabase, query);
      setSuggestions(results);
      setHighlight(0);
    }, 150);

    return () => clearTimeout(debounceRef.current);
  }, [value, range, supabase, textareaRef]);

  function syncMention() {
    const el = textareaRef.current;
    if (!el) return;
    const active = activeMentionAt(value, el.selectionStart ?? value.length);
    setRange(active ? { start: active.start, end: active.end } : null);
  }

  function pick(username: string) {
    if (!range) return;
    const before = value.slice(0, range.start);
    const after = value.slice(range.end);
    const mention = `@${username} `;
    const next = before + mention + after;
    onChange(next);
    setRange(null);
    setSuggestions([]);

    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (!el) return;
      const pos = before.length + mention.length;
      el.focus();
      el.setSelectionRange(pos, pos);
    });
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (!range || suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((i) => (i - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      pick(suggestions[highlight].username);
    } else if (e.key === "Escape") {
      setRange(null);
      setSuggestions([]);
    }
  }

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        name={name}
        rows={rows}
        required={required}
        maxLength={maxLength}
        value={value}
        placeholder={placeholder}
        className={className}
        onChange={(e) => {
          onChange(e.target.value);
          requestAnimationFrame(syncMention);
        }}
        onClick={syncMention}
        onKeyUp={syncMention}
        onKeyDown={onKeyDown}
      />
      {range && suggestions.length > 0 && (
        <MentionSuggestionList
          suggestions={suggestions}
          highlight={highlight}
          onPick={pick}
          onHover={setHighlight}
        />
      )}
    </div>
  );
}
