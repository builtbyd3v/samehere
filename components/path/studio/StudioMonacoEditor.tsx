"use client";

import Editor, { type OnMount } from "@monaco-editor/react";
import { useMemo } from "react";

function languageForPath(path: string): string {
  if (path.endsWith(".tsx") || path.endsWith(".ts")) return "typescript";
  if (path.endsWith(".jsx") || path.endsWith(".js")) return "javascript";
  if (path.endsWith(".json")) return "json";
  if (path.endsWith(".css")) return "css";
  if (path.endsWith(".html")) return "html";
  if (path.endsWith(".md")) return "markdown";
  if (path.endsWith(".sql")) return "sql";
  return "plaintext";
}

export default function StudioMonacoEditor({
  path,
  value,
  readOnly,
  onChange,
}: {
  path: string;
  value: string;
  readOnly: boolean;
  onChange: (value: string) => void;
}) {
  const language = useMemo(() => languageForPath(path), [path]);

  const handleMount: OnMount = (editor) => {
    editor.updateOptions({
      ariaLabel: `Editor for ${path}`,
      tabIndex: 0,
    });
  };

  return (
    <div className="studio-monaco">
      <Editor
        path={path}
        language={language}
        value={value}
        theme="vs-dark"
        loading={<div className="studio-monaco-loading">Loading editor…</div>}
        onMount={handleMount}
        onChange={(next) => {
          if (typeof next === "string") onChange(next);
        }}
        options={{
          readOnly,
          minimap: { enabled: false },
          fontSize: 13,
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
          lineNumbers: "on",
          tabSize: 2,
          insertSpaces: true,
          formatOnPaste: true,
          automaticLayout: true,
          scrollBeyondLastLine: false,
          wordWrap: "on",
          renderLineHighlight: "line",
          padding: { top: 8, bottom: 8 },
          accessibilitySupport: "on",
          domReadOnly: readOnly,
        }}
      />
    </div>
  );
}
