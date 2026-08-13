"use client";

import Editor, { type OnMount } from "@monaco-editor/react";
import { useCallback, useLayoutEffect, useMemo, useRef } from "react";

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
  onChange: (path: string, value: string) => void;
}) {
  const language = useMemo(() => languageForPath(path), [path]);
  const pathRef = useRef(path);
  const onChangeRef = useRef(onChange);
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null);
  const monacoRef = useRef<Parameters<OnMount>[1] | null>(null);

  useLayoutEffect(() => {
    pathRef.current = path;
    onChangeRef.current = onChange;
  }, [onChange, path]);

  const handleMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    editor.updateOptions({
      ariaLabel: `Editor for ${path}`,
      tabIndex: 0,
    });
  };

  const handleChange = useCallback((next: string | undefined) => {
    if (typeof next !== "string") return;

    const currentPath = pathRef.current;
    const modelUri = editorRef.current?.getModel()?.uri.toString() ?? null;
    const expectedUri = monacoRef.current?.Uri.parse(currentPath).toString() ?? null;
    const matchesCurrentPath = modelUri !== null && modelUri === expectedUri;
    if (matchesCurrentPath) onChangeRef.current(currentPath, next);
  }, []);

  return (
    <div className="studio-monaco">
      <Editor
        path={path}
        language={language}
        value={value}
        theme="vs-dark"
        loading={<div className="studio-monaco-loading">Loading editor…</div>}
        onMount={handleMount}
        onChange={handleChange}
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
