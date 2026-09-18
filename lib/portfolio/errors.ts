import { PORTFOLIO_RPC_ERRORS } from "@/types/portfolio";

export const PORTFOLIO_UNAVAILABLE =
  "Portfolio data is not available on this database yet.";

export type PortfolioQueryError = {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
};

export type PortfolioOk<T> = { ok: true; data: T };
export type PortfolioUnavailable = {
  ok: false;
  unavailable: true;
  message: typeof PORTFOLIO_UNAVAILABLE;
};
export type PortfolioFail = {
  ok: false;
  unavailable?: false;
  error: string;
  status: number;
};
export type PortfolioResult<T> = PortfolioOk<T> | PortfolioUnavailable | PortfolioFail;

const SCHEMA_CODES = new Set(["42P01", "42883", "PGRST202", "PGRST205"]);

const SCHEMA_NAME =
  /portfolio_projects|portfolio_settings|portfolio_daily_metrics|record_portfolio_daily_metric|get_public_portfolio|get_public_github|github_contribution|github_connections|open_to|study_mode/i;

export function isPortfolioSchemaMissing(error: PortfolioQueryError | null | undefined): boolean {
  if (!error) return false;
  const code = error.code ?? "";
  const text = `${error.message ?? ""} ${error.details ?? ""} ${error.hint ?? ""}`;
  if (!SCHEMA_CODES.has(code) && !/schema cache|could not find the (table|function)|undefined_(table|function)/i.test(text)) {
    return false;
  }
  return SCHEMA_NAME.test(text) || SCHEMA_CODES.has(code);
}

export function failUnavailable(): PortfolioUnavailable {
  return { ok: false, unavailable: true, message: PORTFOLIO_UNAVAILABLE };
}

export function fail(error: string, status: number): PortfolioFail {
  return { ok: false, error, status };
}

export function classifyWriteError(error: PortfolioQueryError): PortfolioUnavailable | PortfolioFail {
  if (isPortfolioSchemaMissing(error)) return failUnavailable();
  const text = `${error.message ?? ""} ${error.details ?? ""}`;
  if (
    text.includes(PORTFOLIO_RPC_ERRORS.publishRequiresRole) ||
    text.includes("portfolio_projects_publish_role")
  ) {
    return fail("Published project requires a personal role.", 400);
  }
  if (text.includes(PORTFOLIO_RPC_ERRORS.invalidInput) || /portfolio_projects_(repo|demo)_url|portfolio_http_url|portfolio_text_array|portfolio_settings_section_order/i.test(text)) {
    return fail("Invalid input.", 400);
  }
  if (text.includes(PORTFOLIO_RPC_ERRORS.notAuthenticated) || /not authenticated|JWT/i.test(text)) {
    return fail(PORTFOLIO_RPC_ERRORS.notAuthenticated, 401);
  }
  if (text.includes(PORTFOLIO_RPC_ERRORS.notOwner)) {
    return fail(PORTFOLIO_RPC_ERRORS.notOwner, 403);
  }
  if (text.includes(PORTFOLIO_RPC_ERRORS.accountSuspended)) {
    return fail(PORTFOLIO_RPC_ERRORS.accountSuspended, 403);
  }
  if (text.includes(PORTFOLIO_RPC_ERRORS.notFound)) {
    return fail(PORTFOLIO_RPC_ERRORS.notFound, 404);
  }
  return fail(error.message || "Database error.", 500);
}

export function httpStatusFor(result: PortfolioUnavailable | PortfolioFail): number {
  if (result.unavailable) return 503;
  return result.status;
}

export function jsonError(result: PortfolioUnavailable | PortfolioFail): { error: string } {
  if (result.unavailable) return { error: result.message };
  return { error: result.error };
}
