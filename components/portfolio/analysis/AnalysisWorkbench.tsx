"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { githubOwnerSeam } from "@/lib/github/seams";
import { MANUAL_PROJECT_PATH } from "@/lib/github/config";
import { usePrefersReducedMotion } from "@/lib/landing/usePrefersReducedMotion";
import {
  GITHUB_CONNECT_PATH,
  GITHUB_REFRESH_PATH,
  GITHUB_REPOS_PATH,
  GITHUB_STATUS_PATH,
  analysisReadFromBody,
  asPickerRepos,
  evidenceViewFromAnalysis,
  githubErrorCopy,
  isLiveAnalysisKind,
  loadWorkbenchSnapshot,
  ownerRequest,
  replaceAnalysisQuery,
  type GithubStatusPayload,
  type WorkbenchSnapshot,
} from "@/lib/portfolio/analysis-ui";
import { ANALYSES_PATH, analysisCancelPath, analysisPath, analysisRetryPath } from "@/lib/repository-analysis/seams";
import ConnectionPanel from "./ConnectionPanel";
import RepoPicker from "./RepoPicker";
import AnalysisStages from "./AnalysisStages";
import AnalysisEvidenceSeam from "./AnalysisEvidenceSeam";

export default function AnalysisWorkbench({
  initialAnalysisId = null,
  githubError = null,
}: {
  initialAnalysisId?: string | null;
  githubError?: string | null;
}) {
  const oauthError = githubErrorCopy(githubError);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<GithubStatusPayload | null>(null);
  const [repos, setRepos] = useState<WorkbenchSnapshot["repos"]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [analysisId, setAnalysisId] = useState(initialAnalysisId);
  const [presented, setPresented] = useState<WorkbenchSnapshot["presentation"]>(null);
  const [analysis, setAnalysis] = useState<WorkbenchSnapshot["analysis"]>(null);
  const [editorHref, setEditorHref] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(oauthError);
  const [busy, setBusy] = useState(false);
  const [pickAgain, setPickAgain] = useState(false);
  const [paused, setPaused] = useState(false);
  const rootRef = useRef<HTMLElement>(null);
  const reduceMotion = usePrefersReducedMotion();
  const live = isLiveAnalysisKind(presented?.kind);
  const seam = status?.seam ?? githubOwnerSeam(MANUAL_PROJECT_PATH);
  const manualHref = status?.manualProjectPath ?? MANUAL_PROJECT_PATH;

  useEffect(() => {
    let cancelled = false;
    loadWorkbenchSnapshot(initialAnalysisId).then(
      (snap) => {
        if (cancelled) return;
        setStatus(snap.status);
        setRepos(snap.repos);
        setHasMore(snap.hasMore);
        setPage(1);
        setAnalysisId(snap.analysisId ?? initialAnalysisId);
        setPresented(snap.presentation);
        setAnalysis(snap.analysis);
        setEditorHref(snap.editorHref);
        setError(oauthError ?? snap.statusError ?? snap.reposError ?? snap.analysisError);
        setLoading(false);
      },
      () => {
        if (cancelled) return;
        setError(oauthError ?? "Network error. Try again.");
        setLoading(false);
      }
    );
    return () => {
      cancelled = true;
    };
  }, [initialAnalysisId, oauthError]);

  useLayoutEffect(() => {
    if (loading) return;
    replaceAnalysisQuery(analysisId);
  }, [analysisId, loading]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const sync = () => {
      const bounds = root.getBoundingClientRect();
      setPaused(document.visibilityState === "hidden" || bounds.bottom < 0 || bounds.top > window.innerHeight);
    };
    const io = new IntersectionObserver(() => {
      sync();
    }, { threshold: 0.15 });
    io.observe(root);
    document.addEventListener("visibilitychange", sync);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", sync);
    };
  }, []);

  useEffect(() => {
    if (!analysisId || !live || busy) return;
    let cancelled = false;
    let timer: number | undefined;
    const poll = () => {
      timer = window.setTimeout(() => {
        ownerRequest(analysisPath(analysisId)).then((res) => {
          if (cancelled) return;
          if (!res.ok) {
            setError(res.error);
            return;
          }
          const read = analysisReadFromBody(res.body);
          setPresented(read.presentation);
          setAnalysis(read.analysis);
          setEditorHref(read.editorHref);
          if (read.analysisId) setAnalysisId(read.analysisId);
          if (isLiveAnalysisKind(read.presentation?.kind)) poll();
        });
      }, 2000);
    };
    poll();
    return () => {
      cancelled = true;
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [analysisId, live, busy]);

  function applyRead(body: unknown) {
    const read = analysisReadFromBody(body);
    setAnalysisId(read.analysisId);
    setPresented(read.presentation);
    setAnalysis(read.analysis);
    setEditorHref(read.editorHref);
    setPickAgain(false);
  }

  async function reloadStatus() {
    const res = await ownerRequest(GITHUB_STATUS_PATH);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    const next = res.body as GithubStatusPayload;
    setStatus(next);
    if (next.error) setError(next.error);
  }

  async function disconnect() {
    setBusy(true);
    setError(null);
    try {
      const res = await ownerRequest(GITHUB_CONNECT_PATH, { method: "DELETE" });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setRepos([]);
      setHasMore(false);
      setSelectedId(null);
      await reloadStatus();
    } finally {
      setBusy(false);
    }
  }

  async function refreshActivity() {
    setBusy(true);
    setError(null);
    try {
      const res = await ownerRequest(GITHUB_REFRESH_PATH, { method: "POST" });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      await reloadStatus();
    } finally {
      setBusy(false);
    }
  }

  async function analyze() {
    if (selectedId == null) return;
    setBusy(true);
    setError(null);
    try {
      const res = await ownerRequest(ANALYSES_PATH, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ repositoryId: selectedId }),
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      const created = res.body as { analysis_id?: string };
      if (!created.analysis_id) {
        setError("Could not start analysis.");
        return;
      }
      const read = await ownerRequest(analysisPath(created.analysis_id));
      if (!read.ok) {
        setAnalysisId(created.analysis_id);
        setError(read.error);
        return;
      }
      applyRead(read.body);
    } finally {
      setBusy(false);
    }
  }

  async function retry() {
    if (!analysisId) return;
    setBusy(true);
    setError(null);
    try {
      const res = await ownerRequest(analysisRetryPath(analysisId), { method: "POST" });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      const created = res.body as { analysis_id?: string };
      if (!created.analysis_id) {
        setError("Could not retry analysis.");
        return;
      }
      const read = await ownerRequest(analysisPath(created.analysis_id));
      if (!read.ok) {
        setAnalysisId(created.analysis_id);
        setError(read.error);
        return;
      }
      applyRead(read.body);
    } finally {
      setBusy(false);
    }
  }

  async function cancel() {
    if (!analysisId) return;
    setBusy(true);
    setError(null);
    try {
      const res = await ownerRequest(analysisCancelPath(analysisId), { method: "POST" });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      const read = await ownerRequest(analysisPath(analysisId));
      if (read.ok) applyRead(read.body);
      else setError(read.error);
    } finally {
      setBusy(false);
    }
  }

  async function more() {
    const next = page + 1;
    setBusy(true);
    setError(null);
    try {
      const res = await ownerRequest(`${GITHUB_REPOS_PATH}?page=${next}`);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      const listed = asPickerRepos(res.body);
      setRepos((current) => [...current, ...listed.repositories]);
      setHasMore(listed.hasMore);
      setPage(next);
    } finally {
      setBusy(false);
    }
  }

  function recover() {
    const recoverId = analysisId ?? initialAnalysisId;
    setBusy(true);
    setError(null);
    loadWorkbenchSnapshot(recoverId).then(
      (snap) => {
        setStatus(snap.status);
        setRepos(snap.repos);
        setHasMore(snap.hasMore);
        setPage(1);
        setAnalysisId(snap.analysisId ?? recoverId);
        setPresented(snap.presentation);
        setAnalysis(snap.analysis);
        setEditorHref(snap.editorHref);
        setError(snap.statusError ?? snap.reposError ?? snap.analysisError);
        setLoading(false);
      },
      () => {
        setError("Network error. Try again.");
        setLoading(false);
      }
    ).then(() => {
      setBusy(false);
    });
  }

  const connected = status?.connection?.status === "connected";
  const showPicker = Boolean(!loading && connected && status?.analysisAvailable && (pickAgain || !live));
  const evidence =
    presented?.kind === "succeeded" && analysis
      ? evidenceViewFromAnalysis({
          id: analysis.id,
          repository_full_name: analysis.repository_full_name,
          commit_sha: analysis.commit_sha,
          coverage: analysis.coverage,
          evidence: analysis.evidence,
          draft: analysis.draft,
        })
      : null;
  const draftHref = editorHref ?? (analysis?.project_id ? `/profile/projects/${analysis.project_id}/edit` : null);

  return (
    <section ref={rootRef} className="card mb-4 min-w-0 px-5 py-4">
      <h2 className="text-sm font-semibold text-[var(--ink)]">Analyze a public repository</h2>
      {loading ? (
        <p role="status" className="mt-3 text-sm text-[var(--ink-muted)]">
          Loading GitHub…
        </p>
      ) : (
        <>
          <div className="mt-3">
            <ConnectionPanel
              connection={status?.connection ?? null}
              seam={seam}
              oauthAvailable={status?.oauthAvailable ?? false}
              analysisAvailable={status?.analysisAvailable ?? false}
              busy={busy}
              onDisconnect={status?.connection ? () => void disconnect() : undefined}
              onRefresh={connected ? () => void refreshActivity() : undefined}
            />
          </div>
          {status && !status.analysisAvailable && status.oauthAvailable ? (
            <p role="status" className="mt-3 text-sm text-[var(--ink-muted)]">
              Repository analysis is unavailable.{" "}
              <a className="underline" href={manualHref}>
                Add a project manually
              </a>
              .
            </p>
          ) : null}
          {error ? (
            <p role="alert" className="mt-3 text-sm text-[var(--danger)]">
              {error}{" "}
              <button type="button" className="underline" onClick={recover}>
                Retry
              </button>
            </p>
          ) : null}
          {showPicker ? (
            <div className="mt-4">
              <RepoPicker
                repositories={repos}
                selectedId={selectedId}
                onSelect={setSelectedId}
                onAnalyze={() => void analyze()}
                busy={busy}
                hasMore={hasMore}
                onMore={() => void more()}
                filter={filter}
                onFilter={setFilter}
              />
            </div>
          ) : null}
          {presented ? (
            <div className="mt-4" role="status">
              <AnalysisStages presented={presented} reduceMotion={reduceMotion} paused={paused} />
              {presented.kind === "interrupted" ? (
                <p className="mt-3 text-sm text-[var(--ink-muted)]">Analysis was interrupted.</p>
              ) : null}
              {presented.kind === "failed" ? (
                <p className="mt-3 text-sm text-[var(--danger)]">{presented.safeError}</p>
              ) : null}
              {presented.kind === "cancelled" ? (
                <p className="mt-3 text-sm text-[var(--ink-muted)]">{presented.copy}</p>
              ) : null}
              {presented.kind === "succeeded" && evidence ? (
                <div className="mt-4">
                  <AnalysisEvidenceSeam view={evidence} embedded />
                </div>
              ) : null}
              {presented.kind === "succeeded" && draftHref ? (
                <p className="mt-3 text-sm text-[var(--ink)]">
                  Private draft ready.{" "}
                  <a className="underline" href={draftHref}>
                    Open editor
                  </a>
                  . Role confirmation still happens there before publish.
                </p>
              ) : null}
              {(presented.kind === "interrupted" || presented.kind === "failed" || presented.kind === "cancelled") && (
                <button type="button" className="btn-primary mt-3 min-h-11" disabled={busy} onClick={() => void retry()}>
                  Retry
                </button>
              )}
              {live ? (
                <button type="button" className="btn-ghost mt-3 min-h-11" disabled={busy} onClick={() => void cancel()}>
                  Cancel
                </button>
              ) : null}
              {presented.kind === "succeeded" && connected && status?.analysisAvailable && !pickAgain ? (
                <button
                  type="button"
                  className="btn-ghost mt-3 min-h-11"
                  onClick={() => {
                    setPickAgain(true);
                    setSelectedId(null);
                  }}
                >
                  Analyze another repository
                </button>
              ) : null}
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
