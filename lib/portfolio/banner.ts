const HUE_MIN = 190;
const HUE_SPAN = 40;

function hashUsername(username: string): number {
  let hash = 2166136261;
  for (const ch of username.trim().toLowerCase()) {
    hash ^= ch.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export type PortfolioBannerStops = {
  hueA: number;
  hueB: number;
  strengthA: number;
  strengthB: number;
};

export function portfolioBannerStops(username: string): PortfolioBannerStops {
  const hash = hashUsername(username || "samehere");
  return {
    hueA: HUE_MIN + (hash % (HUE_SPAN + 1)),
    hueB: HUE_MIN + ((hash >>> 8) % (HUE_SPAN + 1)),
    strengthA: 14 + ((hash >>> 16) % 9),
    strengthB: 14 + ((hash >>> 24) % 9),
  };
}

export function portfolioBannerCss(username: string, accent?: string | null): string {
  if (accent) {
    return `linear-gradient(120deg, color-mix(in srgb, ${accent} 18%, #161616) 0%, color-mix(in srgb, ${accent} 8%, #0a0a0a) 100%)`;
  }
  const { hueA, hueB, strengthA, strengthB } = portfolioBannerStops(username);
  return `linear-gradient(120deg, hsl(${hueA} 70% 42% / ${strengthA}%) 0%, hsl(${hueB} 62% 48% / ${strengthB}%) 100%), #161616`;
}

export function portfolioBannerOg(username: string): { from: string; to: string } {
  const { hueA, hueB, strengthA, strengthB } = portfolioBannerStops(username);
  return {
    from: `hsla(${hueA}, 70%, 42%, ${strengthA / 100})`,
    to: `hsla(${hueB}, 62%, 48%, ${strengthB / 100})`,
  };
}
