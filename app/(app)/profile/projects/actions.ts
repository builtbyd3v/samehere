"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isPro } from "@/lib/pro";
import { fail, type PortfolioResult } from "@/lib/portfolio/errors";
import {
  createProject,
  deleteProject,
  parseProjectWrite,
  parsePublishFlags,
  reorderProjects,
  saveOwnerSettings,
  setProjectStatus,
  updateProjectFields,
} from "@/lib/portfolio/owner";
import type { PortfolioClient } from "@/lib/portfolio/client";
import type { ProjectWriteInput } from "@/types/portfolio";

export type ProjectActionState = { error?: string; unavailable?: boolean };

async function ownerContext(): Promise<
  PortfolioResult<{ userId: string; username: string; client: PortfolioClient; isPrivate: boolean; isPro: boolean }>
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("You must be logged in.", 401);
  const { data: profile } = await supabase
    .from("profiles")
    .select("username, is_private, is_pro, pro_until")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile?.username) return fail("You must be logged in.", 401);
  return {
    ok: true,
    data: {
      userId: user.id,
      username: profile.username,
      client: supabase,
      isPrivate: profile.is_private,
      isPro: isPro(profile),
    },
  };
}

function actionError(result: PortfolioResult<unknown>): ProjectActionState {
  if (result.ok) return {};
  if (result.unavailable) return { error: result.message, unavailable: true };
  return { error: result.error };
}

function revalidateProfile(username: string, projectId?: string) {
  revalidatePath("/profile/edit");
  revalidatePath(`/profile/${username}`);
  if (projectId) revalidatePath(`/profile/projects/${projectId}/edit`);
}

function writeFromForm(formData: FormData): ProjectWriteInput {
  const technologies = String(formData.get("technologies") ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const keyFeatures = String(formData.get("keyFeatures") ?? "")
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
  return {
    title: String(formData.get("title") ?? ""),
    summary: String(formData.get("summary") ?? "") || null,
    description: String(formData.get("description") ?? "") || null,
    personalRole: String(formData.get("personalRole") ?? "") || null,
    technologies,
    keyFeatures,
    repoUrl: String(formData.get("repoUrl") ?? "") || null,
    demoUrl: String(formData.get("demoUrl") ?? "") || null,
    status: "draft",
  };
}

export async function createProjectAction(
  _prev: ProjectActionState,
  formData: FormData
): Promise<ProjectActionState> {
  const ctx = await ownerContext();
  if (!ctx.ok) return actionError(ctx);
  const parsed = parseProjectWrite(writeFromForm(formData));
  if (!parsed.ok) return actionError(parsed);
  const created = await createProject(ctx.data.client, ctx.data.userId, parsed.data);
  if (!created.ok) return actionError(created);
  revalidateProfile(ctx.data.username, created.data.id);
  redirect(`/profile/projects/${created.data.id}/edit`);
}

export async function updateProjectAction(
  id: string,
  _prev: ProjectActionState,
  formData: FormData
): Promise<ProjectActionState> {
  const ctx = await ownerContext();
  if (!ctx.ok) return actionError(ctx);
  const parsed = parseProjectWrite(writeFromForm(formData));
  if (!parsed.ok) return actionError(parsed);
  const updated = await updateProjectFields(ctx.data.client, ctx.data.userId, id, parsed.data);
  if (!updated.ok) return actionError(updated);
  revalidateProfile(ctx.data.username, id);
  return {};
}

export async function publishProjectAction(id: string, formData: FormData): Promise<ProjectActionState> {
  const ctx = await ownerContext();
  if (!ctx.ok) return actionError(ctx);
  const confirmed = formData.get("roleConfirmed") === "on" || formData.get("roleConfirmed") === "true";
  const result = await setProjectStatus(ctx.data.client, ctx.data.userId, id, "published", confirmed);
  if (!result.ok) return actionError(result);
  revalidateProfile(ctx.data.username, id);
  return {};
}

export async function saveAndPublishProjectAction(
  id: string,
  _prev: ProjectActionState,
  formData: FormData
): Promise<ProjectActionState> {
  const ctx = await ownerContext();
  if (!ctx.ok) return actionError(ctx);
  const parsed = parseProjectWrite(writeFromForm(formData));
  if (!parsed.ok) return actionError(parsed);
  const updated = await updateProjectFields(ctx.data.client, ctx.data.userId, id, parsed.data);
  if (!updated.ok) return actionError(updated);
  const confirmed = formData.get("roleConfirmed") === "on" || formData.get("roleConfirmed") === "true";
  const result = await setProjectStatus(ctx.data.client, ctx.data.userId, id, "published", confirmed);
  if (!result.ok) return actionError(result);
  revalidateProfile(ctx.data.username, id);
  return {};
}

export async function unpublishProjectAction(id: string): Promise<ProjectActionState> {
  const ctx = await ownerContext();
  if (!ctx.ok) return actionError(ctx);
  const result = await setProjectStatus(ctx.data.client, ctx.data.userId, id, "draft", false);
  if (!result.ok) return actionError(result);
  revalidateProfile(ctx.data.username, id);
  return {};
}

export async function deleteProjectAction(id: string): Promise<ProjectActionState> {
  const ctx = await ownerContext();
  if (!ctx.ok) return actionError(ctx);
  const result = await deleteProject(ctx.data.client, ctx.data.userId, id);
  if (!result.ok) return actionError(result);
  revalidateProfile(ctx.data.username);
  redirect(`/profile/${ctx.data.username}`);
}

export async function reorderProjectsAction(ids: string[]): Promise<ProjectActionState> {
  const ctx = await ownerContext();
  if (!ctx.ok) return actionError(ctx);
  const result = await reorderProjects(ctx.data.client, ctx.data.userId, ids);
  if (!result.ok) return actionError(result);
  revalidateProfile(ctx.data.username);
  return {};
}

export async function savePublicationAction(
  _prev: ProjectActionState,
  formData: FormData
): Promise<ProjectActionState> {
  const ctx = await ownerContext();
  if (!ctx.ok) return actionError(ctx);
  const parsed = parsePublishFlags({
    publish_intro: formData.get("publish_intro") === "on",
    publish_projects: formData.get("publish_projects") === "on",
    publish_activity: formData.get("publish_activity") === "on",
    publish_experience: formData.get("publish_experience") === "on",
    publish_education: formData.get("publish_education") === "on",
    publish_posts: formData.get("publish_posts") === "on",
    allow_indexing: formData.get("allow_indexing") === "on",
    ...(formData.getAll("section_order").length > 0
      ? { section_order: formData.getAll("section_order").map(String) }
      : {}),
  });
  if (!parsed.ok) return actionError(parsed);
  const saved = await saveOwnerSettings(
    ctx.data.client,
    ctx.data.userId,
    parsed.data,
    parsed.data.section_order,
    { isPrivate: ctx.data.isPrivate, isPro: ctx.data.isPro }
  );
  if (!saved.ok) return actionError(saved);
  revalidateProfile(ctx.data.username);
  return {};
}
