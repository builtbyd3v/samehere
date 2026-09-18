import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { PORTFOLIO_RPC_ERRORS } from "@/types/portfolio";
import { httpStatusFor, jsonError, type PortfolioResult } from "./errors";
import type { PortfolioClient } from "./client";

export async function requireOwner(): Promise<
  | { ok: true; userId: string; client: PortfolioClient }
  | { ok: false; response: NextResponse }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: PORTFOLIO_RPC_ERRORS.notAuthenticated }, { status: 401 }),
    };
  }
  return { ok: true, userId: user.id, client: supabase };
}

export function resultResponse<T>(result: PortfolioResult<T>, status = 200): NextResponse {
  if (result.ok) return NextResponse.json(result.data, { status });
  return NextResponse.json(jsonError(result), { status: httpStatusFor(result) });
}
