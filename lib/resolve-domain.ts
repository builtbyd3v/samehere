// Best-effort institution name -> primary web domain, via Clearbit's free
// autocomplete endpoint (no auth key). Used when an education entry's
// institution is NOT in the US school list and so carried no domain from the
// school autocomplete (e.g. a certificate from Coursera, AWS, Google). The
// resolved domain feeds the same logo pipeline (lib/school-logo) as schools.
//
// ponytail: best-effort only. Any failure (timeout, non-200, no match, bad
// JSON) returns null and the caller falls back to a monogram. One 3s-capped
// call, made server-side at add/update time, not on render.
export async function resolveInstitutionDomain(name: string): Promise<string | null> {
  const q = name.trim();
  if (!q) return null;
  try {
    const res = await fetch(
      `https://autocomplete.clearbit.com/v1/companies/suggest?query=${encodeURIComponent(q)}`,
      { signal: AbortSignal.timeout(3000), cache: "no-store" },
    );
    if (!res.ok) return null;
    const arr = (await res.json()) as { domain?: string }[];
    const domain = Array.isArray(arr) ? arr[0]?.domain : null;
    return domain && domain.length <= 255 ? domain : null;
  } catch {
    return null;
  }
}
