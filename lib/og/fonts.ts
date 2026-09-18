import { readFile } from "node:fs/promises";

/**
 * Figtree for ImageResponse. Resolved via `import.meta.url` so Next traces the
 * TTFs into the serverless bundle (cwd-relative paths go missing in prod).
 */
export async function loadOgFonts() {
  const [regular, semibold] = await Promise.all([
    readFile(new URL("../../app/fonts/Figtree-Regular.ttf", import.meta.url)),
    readFile(new URL("../../app/fonts/Figtree-SemiBold.ttf", import.meta.url)),
  ]);
  return [
    { name: "Figtree", data: regular, weight: 400 as const, style: "normal" as const },
    { name: "Figtree", data: semibold, weight: 500 as const, style: "normal" as const },
    { name: "Figtree", data: semibold, weight: 600 as const, style: "normal" as const },
  ];
}
