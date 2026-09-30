import { hashSeed } from "@/lib/avatar";

// Full class strings so Tailwind's scanner sees them. Colors are the palette's accent, amber, green, coral.
export const PROJECT_COVERS = [
  "bg-[#101418] bg-[radial-gradient(70%_90%_at_30%_20%,rgba(79,159,232,0.45),transparent_70%)]",
  "bg-[#14120e] bg-[radial-gradient(70%_90%_at_70%_30%,rgba(224,168,58,0.3),transparent_70%)]",
  "bg-[#0e1410] bg-[radial-gradient(70%_90%_at_25%_70%,rgba(95,206,143,0.28),transparent_70%)]",
  "bg-[#15100e] bg-[radial-gradient(70%_90%_at_75%_75%,rgba(224,122,95,0.3),transparent_70%)]",
] as const;

export function projectCoverClass(projectId: string): string {
  return PROJECT_COVERS[hashSeed(projectId) % PROJECT_COVERS.length];
}
