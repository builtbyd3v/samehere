import Image from "next/image";
import AvatarBase from "@/components/ui/Avatar";

// Clubs have no per-club "pro" concept (unlike profile avatars), so this is a
// plain next/image render, not AvatarImage's animated-pause branch — nothing
// here can be animated. Same intrinsic 40x40 + className-controlled display
// size idiom as AvatarImage.
export default function ClubAvatar({
  url,
  name,
  seed,
  className = "h-10 w-10",
}: {
  url: string | null;
  name: string;
  // Stable identity for the fallback color (slug). Falls back to name when a
  // caller has no slug -- clubs rarely rename, so name is an acceptable seed.
  seed?: string;
  className?: string;
}) {
  if (url) {
    return (
      <Image
        src={url}
        alt=""
        width={40}
        height={40}
        className={`${className} shrink-0 rounded-full border border-[var(--border)] object-cover`}
      />
    );
  }

  return (
    <AvatarBase
      src={null}
      seed={seed ?? name}
      name={name}
      className={`${className} shrink-0 rounded-full border border-[var(--border)] text-sm`}
    />
  );
}
