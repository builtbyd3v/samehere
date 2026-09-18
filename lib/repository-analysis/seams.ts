import { MANUAL_PROJECT_PATH } from "@/lib/github/config";
import type { AnalysisPresentation } from "./status";

export const ANALYSES_PATH = "/api/portfolio/analyses";
export const PROJECT_EDITOR_PREFIX = "/profile/projects";

export function analysisPath(id: string): string {
  return `${ANALYSES_PATH}/${id}`;
}

export function analysisRetryPath(id: string): string {
  return `${ANALYSES_PATH}/${id}/retry`;
}

export function analysisCancelPath(id: string): string {
  return `${ANALYSES_PATH}/${id}/cancel`;
}

export function projectEditorPath(id: string): string {
  return `${PROJECT_EDITOR_PREFIX}/${id}/edit`;
}

export type AnalysisIntegrationSeam = {
  createHref: typeof ANALYSES_PATH;
  statusHref: string;
  retryHref: string;
  cancelHref: string;
  manualProjectHref: typeof MANUAL_PROJECT_PATH;
  editorHref: string | null;
};

export function analysisSeam(analysisId: string, projectId: string | null): AnalysisIntegrationSeam {
  return {
    createHref: ANALYSES_PATH,
    statusHref: analysisPath(analysisId),
    retryHref: analysisRetryPath(analysisId),
    cancelHref: analysisCancelPath(analysisId),
    manualProjectHref: MANUAL_PROJECT_PATH,
    editorHref: projectId ? projectEditorPath(projectId) : null,
  };
}

export type { AnalysisPresentation };
