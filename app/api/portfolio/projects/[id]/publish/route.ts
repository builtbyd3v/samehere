import { fail } from "@/lib/portfolio/errors";
import { requireOwner, resultResponse } from "@/lib/portfolio/http";
import { setProjectStatus } from "@/lib/portfolio/owner";

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireOwner();
  if (!auth.ok) return auth.response;
  const { id } = await ctx.params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return resultResponse(fail("Invalid input.", 400));
  }
  const raw = body !== null && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const status = raw.status === "draft" ? "draft" : raw.status === "published" ? "published" : null;
  if (!status) return resultResponse(fail("Invalid input.", 400));
  return resultResponse(
    await setProjectStatus(auth.client, auth.userId, id, status, raw.roleConfirmed === true)
  );
}
