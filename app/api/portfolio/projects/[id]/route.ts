import { fail } from "@/lib/portfolio/errors";
import { requireOwner, resultResponse } from "@/lib/portfolio/http";
import { deleteProject, getOwnerProject, parseProjectWrite, updateProjectFields } from "@/lib/portfolio/owner";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  const auth = await requireOwner();
  if (!auth.ok) return auth.response;
  const { id } = await ctx.params;
  return resultResponse(await getOwnerProject(auth.client, auth.userId, id));
}

export async function PATCH(request: Request, ctx: Ctx) {
  const auth = await requireOwner();
  if (!auth.ok) return auth.response;
  const { id } = await ctx.params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return resultResponse(fail("Invalid input.", 400));
  }
  if (body !== null && typeof body === "object" && "status" in body) {
    return resultResponse(fail("Use POST /api/portfolio/projects/[id]/publish to change status.", 400));
  }
  const parsed = parseProjectWrite({ ...(body as object), status: "draft" });
  if (!parsed.ok) return resultResponse(parsed);
  return resultResponse(await updateProjectFields(auth.client, auth.userId, id, parsed.data));
}

export async function DELETE(_request: Request, ctx: Ctx) {
  const auth = await requireOwner();
  if (!auth.ok) return auth.response;
  const { id } = await ctx.params;
  return resultResponse(await deleteProject(auth.client, auth.userId, id));
}
