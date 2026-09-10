import { fail } from "@/lib/portfolio/errors";
import { requireOwner, resultResponse } from "@/lib/portfolio/http";
import { createProject, listOwnerProjects, parseProjectWrite } from "@/lib/portfolio/owner";

export async function GET() {
  const auth = await requireOwner();
  if (!auth.ok) return auth.response;
  return resultResponse(await listOwnerProjects(auth.client, auth.userId));
}

export async function POST(request: Request) {
  const auth = await requireOwner();
  if (!auth.ok) return auth.response;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return resultResponse(fail("Invalid input.", 400));
  }
  const parsed = parseProjectWrite(body);
  if (!parsed.ok) return resultResponse(parsed);
  return resultResponse(await createProject(auth.client, auth.userId, parsed.data), 201);
}
