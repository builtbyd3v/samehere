import { describe, expect, it } from "vitest";
import {
  PORTFOLIO_UNAVAILABLE,
  classifyWriteError,
  httpStatusFor,
  isPortfolioSchemaMissing,
} from "./errors";

describe("isPortfolioSchemaMissing", () => {
  it("matches PostgREST missing portfolio function/table", () => {
    expect(
      isPortfolioSchemaMissing({
        code: "PGRST202",
        message: "Could not find the function public.get_public_portfolio in the schema cache",
      })
    ).toBe(true);
    expect(
      isPortfolioSchemaMissing({
        code: "PGRST205",
        message: "Could not find the table 'public.portfolio_projects' in the schema cache",
      })
    ).toBe(true);
    expect(
      isPortfolioSchemaMissing({
        code: "42P01",
        message: 'relation "portfolio_settings" does not exist',
      })
    ).toBe(true);
  });

  it("does not swallow genuine query errors", () => {
    expect(
      isPortfolioSchemaMissing({
        code: "42501",
        message: "permission denied for table portfolio_projects",
      })
    ).toBe(false);
    expect(
      isPortfolioSchemaMissing({
        code: "23514",
        message: "new row violates check constraint portfolio_projects_publish_role",
      })
    ).toBe(false);
    expect(isPortfolioSchemaMissing({ message: "connection refused" })).toBe(false);
    expect(isPortfolioSchemaMissing(null)).toBe(false);
  });
});

describe("classifyWriteError", () => {
  it("maps missing schema to 503 unavailable", () => {
    const result = classifyWriteError({
      code: "PGRST202",
      message: "Could not find the function public.get_public_portfolio",
    });
    expect(result).toEqual({ ok: false, unavailable: true, message: PORTFOLIO_UNAVAILABLE });
    expect(httpStatusFor(result)).toBe(503);
  });

  it("maps publish-role constraint to 400, not success", () => {
    const result = classifyWriteError({
      code: "23514",
      message: "new row violates check constraint portfolio_projects_publish_role",
    });
    expect(result).toEqual({
      ok: false,
      error: "Published project requires a personal role.",
      status: 400,
    });
  });

  it("keeps unknown database failures as 500", () => {
    const result = classifyWriteError({ message: "deadlock detected" });
    expect(result).toEqual({ ok: false, error: "deadlock detected", status: 500 });
  });
});
