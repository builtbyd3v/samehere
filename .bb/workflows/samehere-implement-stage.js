export const meta = {
  name: "samehere-implement-stage",
  description: "Implement selected Samehere workstreams, then return to the primary assistant for review.",
  phases: [{ title: "Implementation", detail: "Grok workers implement bounded assignments and run checks." }],
  inputSchema: {
    type: "object",
    additionalProperties: false,
    required: ["preflightVerified", "tasks", "reviewedTasks"],
    properties: {
      preflightVerified: { type: "boolean" },
      tasks: {
        type: "array", minItems: 1, maxItems: 3,
        items: { enum: ["data", "design", "social", "portfolio", "github-analysis", "pro-referrals", "integration"] },
      },
      reviewedTasks: {
        type: "array",
        items: { enum: ["data", "design", "social", "portfolio", "github-analysis", "pro-referrals", "integration"] },
      },
      correctionInstructions: { type: "string" },
    },
  },
};

if (!args || args.preflightVerified !== true) {
  throw new Error("Dispatch paused: the primary assistant must verify the authorized provider/model/reasoning, effective fast tier, compatible permissions, and working checkout first.");
}

const dependencies = {
  data: [],
  design: [],
  social: ["data", "design"],
  portfolio: ["data", "design"],
  "github-analysis": ["data", "social"],
  "pro-referrals": ["data", "design", "portfolio", "github-analysis"],
  integration: ["social", "portfolio", "github-analysis", "pro-referrals"],
};

const tasks = args.tasks;
const reviewed = new Set(args.reviewedTasks);
if (!Array.isArray(tasks) || tasks.length < 1 || tasks.length > 3 || new Set(tasks).size !== tasks.length) {
  throw new Error("Select one to three distinct task IDs.");
}
for (const task of tasks) {
  if (!Object.hasOwn(dependencies, task)) throw new Error("Unknown task: " + task);
  const missing = dependencies[task].filter((id) => !reviewed.has(id));
  if (missing.length) throw new Error(task + " awaits primary-assistant review of: " + missing.join(", "));
}
// Only these task pairs have reviewed, non-overlapping write ownership.
const independentPairs = [new Set(["data", "design"]), new Set(["social", "portfolio"])];
if (tasks.length > 1 && !independentPairs.some((pair) => tasks.length === pair.size && tasks.every((task) => pair.has(task)))) {
  throw new Error("These tasks must run separately under the reviewed file-ownership plan.");
}

const outputSchema = {
  type: "object",
  additionalProperties: false,
  required: ["task", "status", "summary", "changedFiles", "checks", "evidence", "blockers", "configurationNeeded"],
  properties: {
    task: { type: "string" },
    status: { enum: ["complete", "blocked"] },
    summary: { type: "string" },
    changedFiles: { type: "array", items: { type: "string" } },
    checks: {
      type: "array",
      items: {
        type: "object", additionalProperties: false,
        required: ["name", "status", "detail"],
        properties: {
          name: { type: "string" }, status: { enum: ["passed", "failed", "not-run"] }, detail: { type: "string" },
        },
      },
    },
    evidence: { type: "array", items: { type: "string" } },
    blockers: { type: "array", items: { type: "string" } },
    configurationNeeded: { type: "array", items: { type: "string" } },
  },
};

log("Dispatching " + tasks.join(", ") + "; effective fast tier and exact provider must have been verified by the primary assistant.");
const results = await pipeline(tasks, (task) => agent(
  "Read SAMEHERE_IMPLEMENTATION_SPEC.md and SAMEHERE_WORKSTREAMS.md in the current checkout. " +
  "Implement only task `" + task + "`, respecting its owned files and completion criteria. " +
  "The primary assistant is the sole planner, orchestrator, and reviewer. You are the implementation worker: do not spawn agents, independently redesign the scope, commit, merge, push, deploy, apply live migrations, or send emails/messages. " +
  "Run meaningful checks for your changes, preserve existing user data and unrelated work, and report failures or missing configuration precisely. " +
  "Use Node 24 for repository commands. The existing dev server is owned by the primary assistant; coordinate restarts and avoid competing processes on port 3000. " +
  "If a necessary edit crosses ownership, return the exact requested edit as a blocker instead of making it. " +
  "Return the structured result for this task; blocked requirements must not be marked complete. " +
  (args.correctionInstructions ? "Primary-assistant correction instructions: " + args.correctionInstructions : ""),
  {
    provider: "acp-cursor",
    model: "grok-4.6",
    reasoningLevel: "xhigh",
    label: "samehere: " + task,
    phase: "Implementation",
    schema: outputSchema,
  }
));

const complete = results.length === tasks.length && results.every((result, index) => result && result.task === tasks[index] && result.status === "complete");
log(complete ? "Workers returned complete results; primary-assistant review is required before the next stage." : "Stage has incomplete or failed work; return to the primary assistant for correction assignments.");
return { state: complete ? "awaiting-primary-review" : "needs-attention", tasks, results };
