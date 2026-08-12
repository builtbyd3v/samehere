"use client";

import { useMemo, useState } from "react";
import type { StudioStarterFile } from "@/lib/path/types";

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
            <span className="studio-file-tree-dir" style={{ paddingLeft: `${0.55 + depth * 0.85}rem` }}>
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

/**
 * Client-only file tree + read-only source viewer.
 * Selection stays in-component — no route changes.
 */
export default function StudioFilePane({
  entryFile,
  visibleFiles,
  starterFiles,
  className = "",
}: {
  entryFile: string;
  visibleFiles: string[];
  starterFiles: StudioStarterFile[];
  className?: string;
}) {
  const filesByPath = useMemo(() => {
    const map = new Map<string, StudioStarterFile>();
    for (const file of starterFiles) map.set(file.path, file);
    return map;
  }, [starterFiles]);

  const tree = useMemo(() => buildFileTree(visibleFiles), [visibleFiles]);
  const [selectedPath, setSelectedPath] = useState(() =>
    visibleFiles.includes(entryFile) ? entryFile : (visibleFiles[0] ?? ""),
  );

  const selected = selectedPath ? filesByPath.get(selectedPath) : undefined;
  const lineCount = selected ? selected.code.split("\n").length : 0;

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
            selectedPath={selectedPath}
            onSelect={setSelectedPath}
          />
        )}
      </aside>

      <section className="studio-code-viewer" aria-label="Source viewer">
        <div className="studio-code-toolbar">
          <span className="studio-code-path">{selectedPath || "No file selected"}</span>
          {selected?.readOnly ? <span className="studio-code-badge">Read-only</span> : null}
          {selected ? (
            <span className="studio-code-meta">{lineCount} lines</span>
          ) : null}
        </div>
        {selected ? (
          <pre className="studio-code-pre app-panel-scroll">
            <code>{selected.code}</code>
          </pre>
        ) : (
          <div className="studio-empty-panel" role="status">
            <p className="studio-empty-title">No source to show</p>
            <p className="studio-empty-copy">
              Pick a file from the tree. Wave 1 is read-only — editing arrives with the desktop
              editor later.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
