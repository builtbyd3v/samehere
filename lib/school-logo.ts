// logo.dev needs a free publishable token in NEXT_PUBLIC_LOGO_DEV_TOKEN; without it
// we fall back to the Google favicon service.
// ponytail: the Google favicon fallback is a baked-in white-plate icon, it can't be
// made transparent here, that's a hosted-service limitation not a bug in this code.

export function schoolLogoUrl(domain: string | null | undefined): string | null {
  if (!domain) return null;

  const trimmedDomain = domain.trim();
  if (!trimmedDomain) return null;

  const encodedDomain = encodeURIComponent(trimmedDomain);
  const token = process.env.NEXT_PUBLIC_LOGO_DEV_TOKEN;

  if (token) {
    // Transparent PNG (no forced theme) so CompanyLogo can read the logo's own
    // pixels and pick a contrasting chip background. logo.dev sends ACAO:*, so
    // the canvas read is not tainted.
    return `https://img.logo.dev/${encodedDomain}?token=${token}&size=128&format=png`;
  }

  return `https://www.google.com/s2/favicons?domain=${encodedDomain}&sz=128`;
}
