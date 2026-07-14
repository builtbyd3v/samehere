import type { CSSProperties } from "react";
import AvatarImage from "./AvatarImage";
import { avatarColor, avatarInitial } from "@/lib/avatar";

/**
 * One avatar for the whole app. Renders the photo when there is one, else a
 * solid disc colored deterministically from `seed` with the name's initial.
 *
 * `className` carries geometry + shape (h-N w-N, rounded-full/-lg, border) and
 * applies to both branches. Include a text-size class there too — it only
 * affects the fallback letter. `seed` is the stable identity for the color
 * (username / slug / org name); `name` is the letter source and falls back to
 * seed.
 */
export default function Avatar({
  src,
  seed,
  name,
  alt = "",
  className = "",
  style,
  pro = false,
  priority = false,
}: {
  src?: string | null;
  seed: string;
  name?: string;
  alt?: string;
  className?: string;
  style?: CSSProperties;
  pro?: boolean;
  priority?: boolean;
}) {
  if (src) {
    return (
      <AvatarImage src={src} alt={alt} pro={pro} priority={priority} className={`${className} object-cover`} style={style} />
    );
  }
  return (
    <div className={`${className} grid place-items-center font-semibold text-white`} style={{ ...style, backgroundColor: avatarColor(seed) }}>
      {avatarInitial(name || seed)}
    </div>
  );
}
