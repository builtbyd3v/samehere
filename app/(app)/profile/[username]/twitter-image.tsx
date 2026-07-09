// Twitter falls back badly without a dedicated twitter-image route. Re-export
// the existing opengraph-image (heatmap card) rather than duplicate the ImageResponse code.
export { default, alt, size, contentType } from "./opengraph-image";
