import type { StudioManifest } from "@/lib/path/types";
import { getProjectBySlug } from "@/lib/path/seeds/projects";
import { URL_SHORTENER_STUDIO_MANIFEST } from "@/lib/path/studio/manifests/url-shortener";
import {
  validateMilestoneChecklistLinkage,
  validateStudioManifest,
} from "@/lib/path/studio/validate";

const MANIFEST_BY_SLUG: Record<string, StudioManifest> = {
  "url-shortener": URL_SHORTENER_STUDIO_MANIFEST,
};

/**
 * Look up a curated Project Studio manifest by path project slug.
 * Returns null for unknown slugs or manifests that fail defensive validation.
 */
export function getStudioManifest(projectSlug: string): StudioManifest | null {
  if (typeof projectSlug !== "string" || projectSlug.trim() === "") return null;
  const candidate = MANIFEST_BY_SLUG[projectSlug];
  if (!candidate) return null;
  const result = validateStudioManifest(candidate);
  if (!result.ok) return null;
  const project = getProjectBySlug(projectSlug);
  if (!project) return null;
  const linkage = validateMilestoneChecklistLinkage(
    result.manifest,
    project.build_checklist.map((item) => item.id),
  );
  return linkage.ok ? linkage.manifest : null;
}
