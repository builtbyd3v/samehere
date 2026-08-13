"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import type { SaveStatus } from "@/components/path/studio/useStudioWorkspace";

const StudioMonacoEditor = dynamic(
  () => import("@/components/path/studio/StudioMonacoEditor"),
  {
    ssr: false,
    loading: () => <div className="studio-monaco-loading">Loading editor…</div>,
  },
);

type TreeDir = {
  kind: "dir";
  name: string;
  path: string;
  children: TreeNode[];
};

type TreeFile = {
  kind: "file";
  name: string;
  path: string;
};

type TreeNode = TreeDir | TreeFile;

function buildFileTree(paths: string[]): TreeNode[] {
  const root: TreeDir = { kind: "dir", name: "", path: "", children: [] };

  for (const filePath of paths) {
    const parts = filePath.split("/");
    let cursor = root;
    parts.forEach((part, index) => {
      const isFile = index === parts.length - 1;
      const nextPath = parts.slice(0, index + 1).join("/");
      if (isFile) {
        if (!cursor.children.some((child) => child.kind === "file" && child.path === nextPath)) {
          cursor.children.push({ kind: "file", name: part, path: nextPath });
        }
        return;
      }
      let dir = cursor.children.find(
        (child): child is TreeDir => child.kind === "dir" && child.name === part,
      );
      if (!dir) {
        dir = { kind: "dir", name: part, path: nextPath, children: [] };
        cursor.children.push(dir);
      }
      cursor = dir;
    });
  }

  const sortNodes = (nodes: TreeNode[]): TreeNode[] =>
    [...nodes].sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === "dir" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

  const sortDeep = (nodes: TreeNode[]): TreeNode[] =>
    sortNodes(nodes).map((node) =>
      node.kind === "dir" ? { ...node, children: sortDeep(node.children) } : node,
    );

  return sortDeep(root.children);
}

function TreeList({
  nodes,
  depth,
  selectedPath,
  onSelect,
}: {
  nodes: TreeNode[];
  depth: number;
  selectedPath: string;
  onSelect: (path: string) => void;
}) {
  return (
    <ul className="studio-file-tree-list" role={depth === 0 ? "tree" : "group"}>
      {nodes.map((node) =>
        node.kind === "dir" ? (
          <li key={node.path} role="treeitem" aria-expanded="true" aria-selected="false">
            <span
              className="studio-file-tree-dir"
              style={{ paddingLeft: `${0.55 + depth * 0.85}rem` }}
            >
              {node.name}/
            </span>
            <TreeList
              nodes={node.children}
              depth={depth + 1}
              selectedPath={selectedPath}
              onSelect={onSelect}
            />
          </li>
        ) : (
          <li key={node.path} role="treeitem" aria-selected={selectedPath === node.path}>
            <button
              type="button"
              className="studio-file-tree-file"
              data-active={selectedPath === node.path ? "true" : "false"}
              style={{ paddingLeft: `${0.55 + depth * 0.85}rem` }}
              onClick={() => onSelect(node.path)}
            >
              {node.name}
            </button>
          </li>
        ),
      )}
    </ul>
  );
}

function saveStatusLabel(status: SaveStatus): string {
  switch (status) {
    case "saved":
      return "Saved";
    case "saving":
      return "Saving";
    case "dirty":
      return "Not saved";
    case "conflict":
      return "Conflict";
    case "error":
      return "Not saved";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

/**
 * File tree + code surface.
 * Desktop: Monaco (dynamic). Mobile: read-only highlighted source.
 * Selection stays in-component — no route changes.
 */
export default function StudioFilePane({
  entryFile,
  visibleFiles,
  selectedPath,
  onSelectPath,
  content,
  readOnly,
  editable,
  saveStatus,
  saveMessage,
  onContentChange,
  className = "",
}: {
  entryFile: string;
  visibleFiles: string[];
  selectedPath: string;
  onSelectPath: (path: string) => void;
  content: string;
  readOnly: boolean;
  /** When false, never mount Monaco (mobile). */
  editable: boolean;
  saveStatus: SaveStatus;
  saveMessage: string | null;
  onContentChange: (path: string, value: string) => void;
  className?: string;
}) {
  const tree = useMemo(() => buildFileTree(visibleFiles), [visibleFiles]);
  const lineCount = content ? content.split("\n").length : 0;
  const statusText = saveStatusLabel(saveStatus);

  return (
    <div className={`studio-file-pane ${className}`.trim()}>
      <aside className="studio-file-tree" aria-label="Project files">
        <div className="studio-panel-label">Files</div>
        {tree.length === 0 ? (
          <p className="studio-empty-inline">No starter files in this manifest.</p>
        ) : (
          <TreeList
            nodes={tree}
            depth={0}
            selectedPath={selectedPath || entryFile}
            onSelect={onSelectPath}
          />
        )}
      </aside>

      <section className="studio-code-viewer" aria-label={editable ? "Code editor" : "Source viewer"}>
        <div className="studio-code-toolbar">
          <span className="studio-code-path">{selectedPath || "No file selected"}</span>
          {readOnly ? <span className="studio-code-badge">Read-only</span> : null}
          {editable ? (
            <span
              className="studio-save-status"
              data-status={saveStatus}
              aria-live="polite"
              title={saveMessage ?? undefined}
            >
              {statusText}
            </span>
          ) : (
            <span className="studio-code-meta">{lineCount} lines</span>
          )}
        </div>
        {selectedPath ? (
          editable ? (
            <StudioMonacoEditor
              path={selectedPath}
              value={content}
              readOnly={readOnly}
              onChange={onContentChange}
            />
          ) : (
            <pre className="studio-code-pre app-panel-scroll">
              <code className="studio-code-highlight">{content}</code>
            </pre>
          )
        ) : (
          <div className="studio-empty-panel" role="status">
            <p className="studio-empty-title">No source to show</p>
            <p className="studio-empty-copy">Pick a file from the tree.</p>
          </div>
        )}
      </section>
    </div>
  );
}
