"use server";

import { revalidatePath } from "next/cache";
import { loadViewerPathPlanUi } from "@/lib/path/load-plan";
import { rediagnoseUser } from "@/lib/path/rediagnose";
import {
  isPathFeedbackOutcome,
  type PathFeedbackOutcome,
  type PathShift,
} from "@/lib/path/task-feedback";
import { createClient } from "@/lib/supabase/server";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type PathTaskFeedbackActionResult = {
  error?: string;
  success?: true;
  shift?: PathShift;
};

export async function startPathTask(taskId: string): Promise<{ error?: string }> {
  if (!taskId) return { error: "Task is missing." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in to update your path." };

  const { error } = await supabase
    .from("path_tasks")
    .update({ status: "doing", updated_at: new Date().toISOString() })
    .eq("id", taskId)
    .eq("user_id", user.id)
    .eq("status", "todo");

  if (error) return { error: "Could not start this task." };
  revalidatePath("/home");
  return {};
}

export async function submitPathTaskFeedback(
  taskId: string,
  outcome: string,
  note?: string,
): Promise<PathTaskFeedbackActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in to update your path." };

  if (typeof taskId !== "string" || !UUID_RE.test(taskId)) {
    return { error: "Task is invalid." };
  }
  if (!isPathFeedbackOutcome(outcome)) {
    return { error: "Feedback choice is invalid." };
  }

  const { data: task, error: taskError } = await supabase
    .from("path_tasks")
    .select("id, title")
    .eq("id", taskId)
    .eq("user_id", user.id)
    .in("status", ["todo", "doing"])
    .maybeSingle();

  if (taskError) return { error: "Could not check this task. Try again." };
  if (!task) return { error: "This task is no longer active." };

  const priorPlan = await loadViewerPathPlanUi(supabase, user.id);

  const blockerNote =
    outcome === "stuck" && typeof note === "string" ? note.trim().slice(0, 400) : "";
  const now = new Date().toISOString();
  const { error: feedbackError } = await supabase
    .from("path_task_feedback")
    .upsert(
      {
        user_id: user.id,
        path_task_id: task.id,
        outcome,
        note: blockerNote || null,
        updated_at: now,
      },
      { onConflict: "user_id,path_task_id" },
    );

  if (feedbackError) return { error: "Could not save your feedback. Try again." };

  const nextStatus: Record<PathFeedbackOutcome, "done" | "skipped"> = {
    helped: "done",
    not_relevant: "skipped",
    stuck: "skipped",
  };
  const { data: updatedTask, error: statusError } = await supabase
    .from("path_tasks")
    .update({ status: nextStatus[outcome], updated_at: now })
    .eq("id", task.id)
    .eq("user_id", user.id)
    .in("status", ["todo", "doing"])
    .select("id")
    .maybeSingle();

  if (statusError || !updatedTask) {
    return {
      error: "Feedback was saved, but the task could not be updated. Try again.",
    };
  }

  try {
    await rediagnoseUser(supabase, user.id, {
      reason: `path_feedback_${outcome}`,
      blockerNote: outcome === "stuck" ? blockerNote || undefined : undefined,
    });
  } catch {
    // The feedback and task status are already saved. Path refresh is best-effort.
  }

  // What the learner should see change, in place, without hunting for it.
  const [nextPlan, { data: nextTask }] = await Promise.all([
    loadViewerPathPlanUi(supabase, user.id),
    supabase
      .from("path_tasks")
      .select("title")
      .eq("user_id", user.id)
      .in("status", ["todo", "doing"])
      .order("sort_index", { ascending: true })
      .limit(1)
      .maybeSingle(),
  ]);

  const shift: PathShift = {
    outcome,
    previousTitle: task.title,
    nextTitle: nextTask?.title ?? null,
    recipe: nextPlan?.ui_recipe ?? null,
    recipeChanged:
      !!priorPlan && !!nextPlan && priorPlan.ui_recipe !== nextPlan.ui_recipe,
    why: nextPlan?.why ?? null,
  };

  revalidatePath("/home");
  return { success: true, shift };
}
