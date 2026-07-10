import Image from "next/image";

// Clubs have no per-club "pro" concept (unlike profile avatars), so this is a
// plain next/image render, not AvatarImage's animated-pause branch — nothing
// here can be animated. Same intrinsic 40x40 + className-controlled display
// size idiom as AvatarImage.
export default function ClubAvatar({
  url,
  name,
  className = "h-10 w-10",
}: {
  url: string | null;
  name: string;
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
    <div
      className={`${className} grid shrink-0 place-items-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-sm font-semibold text-[var(--ink-muted)]`}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}
