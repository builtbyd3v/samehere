"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { saveProjectWorkspaceFile } from "@/app/(app)/projects/actions";
import type {
  ProjectWorkspaceSnapshot,
  SaveProjectWorkspaceFileResult,
} from "@/lib/path/studio/workspace";
import type { StudioManifest, StudioStarterFile } from "@/lib/path/types";

export type SaveStatus = "saved" | "saving" | "dirty" | "conflict" | "error";

type FileEntry = {
  content: string;
  revision: number;
  readOnly: boolean;
};

const SAVE_DEBOUNCE_MS = 700;

function buildInitialFiles(
  starterFiles: StudioStarterFile[],
  snapshot: ProjectWorkspaceSnapshot | null,
): Map<string, FileEntry> {
  const map = new Map<string, FileEntry>();
  for (const file of starterFiles) {
    map.set(file.path, {
      content: file.code,
      revision: 0,
      readOnly: file.readOnly === true,
    });
  }
  if (snapshot) {
    for (const file of snapshot.files) {
      const existing = map.get(file.path);
      map.set(file.path, {
        content: file.content,
        revision: file.revision,
        readOnly: existing?.readOnly ?? false,
      });
    }
  }
  return map;
}

function pickInitialPath(
  manifest: StudioManifest,
  snapshot: ProjectWorkspaceSnapshot | null,
): string {
  if (snapshot?.activeFile && manifest.visibleFiles.includes(snapshot.activeFile)) {
    return snapshot.activeFile;
  }
  if (manifest.visibleFiles.includes(manifest.entryFile)) return manifest.entryFile;
  return manifest.visibleFiles[0] ?? "";
}

export function useStudioWorkspace({
  projectSlug,
  manifest,
  snapshot,
  canPersist,
}: {
  projectSlug: string;
  manifest: StudioManifest;
  snapshot: ProjectWorkspaceSnapshot | null;
  canPersist: boolean;
}) {
  const [files, setFiles] = useState(() => buildInitialFiles(manifest.starterFiles, snapshot));
  const [selectedPath, setSelectedPath] = useState(() => pickInitialPath(manifest, snapshot));
  const [workspaceRevision, setWorkspaceRevision] = useState(
    () => snapshot?.workspaceRevision ?? 0,
  );
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const filesRef = useRef(files);
  const workspaceRevisionRef = useRef(workspaceRevision);
  const selectedPathRef = useRef(selectedPath);
  const saveTimersRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    filesRef.current = files;
  }, [files]);

  useEffect(() => {
    workspaceRevisionRef.current = workspaceRevision;
  }, [workspaceRevision]);

  useEffect(() => {
    selectedPathRef.current = selectedPath;
  }, [selectedPath]);

  useEffect(() => {
    const timers = saveTimersRef.current;
    return () => {
      for (const timer of timers.values()) clearTimeout(timer);
      timers.clear();
    };
  }, []);

  const flushSave = useCallback(
    async (path: string) => {
      if (!canPersist) {
        setSaveStatus("dirty");
        setSaveMessage("Sign in to checkpoint edits.");
        return;
      }

      const entry = filesRef.current.get(path);
      if (!entry || entry.readOnly) return;

      setSaveStatus("saving");
      setSaveMessage(null);

      let result: SaveProjectWorkspaceFileResult;
      try {
        result = await saveProjectWorkspaceFile({
          projectSlug,
          templateVersion: manifest.version,
          path,
          content: entry.content,
          expectedWorkspaceRevision: workspaceRevisionRef.current,
          expectedFileRevision: entry.revision,
        });
      } catch {
        setSaveStatus("error");
        setSaveMessage("Could not save. Try again.");
        return;
      }

      if (result.kind === "success") {
        workspaceRevisionRef.current = result.workspaceRevision;
        setWorkspaceRevision(result.workspaceRevision);
        const next = new Map(filesRef.current);
        const current = next.get(path);
        if (current) next.set(path, { ...current, revision: result.fileRevision });
        filesRef.current = next;
        setFiles(next);
        setSaveStatus("saved");
        setSaveMessage(null);
        return;
      }

      if (result.kind === "conflict") {
        workspaceRevisionRef.current = result.workspaceRevision;
        setWorkspaceRevision(result.workspaceRevision);
        if (typeof result.fileRevision === "number") {
          const next = new Map(filesRef.current);
          const current = next.get(path);
          if (current) next.set(path, { ...current, revision: result.fileRevision });
          filesRef.current = next;
          setFiles(next);
        }
        setSaveStatus("conflict");
        setSaveMessage(result.error);
        return;
      }

      setSaveStatus("error");
      setSaveMessage(result.error);
    },
    [canPersist, manifest.version, projectSlug],
  );

  const enqueueSave = useCallback(
    (path: string) => {
      saveQueueRef.current = saveQueueRef.current.then(() => flushSave(path));
    },
    [flushSave],
  );

  const scheduleSave = useCallback(
    (path: string) => {
      const existing = saveTimersRef.current.get(path);
      if (existing) clearTimeout(existing);
      const timer = setTimeout(() => {
        saveTimersRef.current.delete(path);
        enqueueSave(path);
      }, SAVE_DEBOUNCE_MS);
      saveTimersRef.current.set(path, timer);
    },
    [enqueueSave],
  );

  const updateFileContent = useCallback(
    (path: string, content: string) => {
      const entry = filesRef.current.get(path);
      if (!entry || entry.readOnly) return;
      if (entry.content === content) return;

      const next = new Map(filesRef.current);
      next.set(path, { ...entry, content });
      filesRef.current = next;
      setFiles(next);
      setSaveStatus("dirty");
      setSaveMessage(null);
      scheduleSave(path);
    },
    [scheduleSave],
  );

  const selectPath = useCallback(
    (path: string) => {
      const current = selectedPathRef.current;
      const pending = saveTimersRef.current.get(current);
      if (pending) {
        clearTimeout(pending);
        saveTimersRef.current.delete(current);
        enqueueSave(current);
      }
      selectedPathRef.current = path;
      setSelectedPath(path);
    },
    [enqueueSave],
  );

  const getFileContent = useCallback(
    (path: string): string => files.get(path)?.content ?? "",
    [files],
  );

  const selected = selectedPath ? files.get(selectedPath) : undefined;

  return {
    files,
    selectedPath,
    setSelectedPath: selectPath,
    selected,
    saveStatus,
    saveMessage,
    workspaceRevision,
    updateFileContent,
    getFileContent,
    pagePreviewCode: files.get("app/page.tsx")?.content ?? "",
  };
}
