import { isPortfolioSchemaMissing, fail, failUnavailable, classifyWriteError, type PortfolioFail, type PortfolioQueryError, type PortfolioUnavailable } from "@/lib/portfolio/errors";
import { PORTFOLIO_RPC_ERRORS } from "@/types/portfolio";

const ANALYSIS_SCHEMA = /repository_analyses|reserve_repository_analysis|retry_repository_analysis|github_credentials|upsert_github_connection/i;

export function isAnalysisSchemaMissing(error: PortfolioQueryError | null | undefined): boolean {
  if (isPortfolioSchemaMissing(error)) return true;
  if (!error) return false;
  const text = `${error.message ?? ""} ${error.details ?? ""} ${error.hint ?? ""}`;
  return ANALYSIS_SCHEMA.test(text);
}

export function classifyAnalysisRpc(error: PortfolioQueryError): PortfolioUnavailable | PortfolioFail {
  if (isAnalysisSchemaMissing(error)) return failUnavailable();
  const text = `${error.message ?? ""} ${error.details ?? ""}`;
  if (text.includes(PORTFOLIO_RPC_ERRORS.quotaExceeded)) {
    return fail("Monthly analysis allowance reached. Create a project manually or wait for next month.", 429);
  }
  if (text.includes(PORTFOLIO_RPC_ERRORS.dailyAttemptCap)) {
    return fail("Daily analysis attempt limit reached. Try again tomorrow or add a project manually.", 429);
  }
  if (text.includes(PORTFOLIO_RPC_ERRORS.analysisInProgress)) {
    return fail("An analysis is already in progress.", 409);
  }
  if (text.includes(PORTFOLIO_RPC_ERRORS.connectionInactive)) {
    return fail("GitHub needs to be connected before you can analyze a repository.", 409);
  }
  if (text.includes(PORTFOLIO_RPC_ERRORS.staleEpoch) || text.includes(PORTFOLIO_RPC_ERRORS.staleAttempt)) {
    return fail("This analysis is no longer current.", 409);
  }
  if (text.includes(PORTFOLIO_RPC_ERRORS.leaseHeld) || text.includes(PORTFOLIO_RPC_ERRORS.leaseExpired)) {
    return fail("This analysis was interrupted. Retry to start a new attempt.", 409);
  }
  return classifyWriteError(error);
}

export const ANALYSIS_UNAVAILABLE =
  "Repository analysis is unavailable. You can still add a project manually.";
export const GITHUB_UNAVAILABLE =
  "GitHub connection is unavailable. You can still add a project manually.";
