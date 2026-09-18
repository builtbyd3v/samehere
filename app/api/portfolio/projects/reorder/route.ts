import { fail } from "@/lib/portfolio/errors";
import { requireOwner, resultResponse } from "@/lib/portfolio/http";
import { reorderProjects } from "@/lib/portfolio/owner";

export async function POST(request: Request) {
  const auth = await requireOwner();
  if (!auth.ok) return auth.response;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return resultResponse(fail("Invalid input.", 400));
  }
  const ids = body !== null && typeof body === "object" ? (body as { ids?: unknown }).ids : null;
  if (!Array.isArray(ids)) return resultResponse(fail("Invalid input.", 400));
  return resultResponse(await reorderProjects(auth.client, auth.userId, ids.map(String)));
}
