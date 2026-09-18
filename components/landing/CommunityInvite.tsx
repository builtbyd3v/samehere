import Link from "next/link";
import { ghostCta, signupCta } from "./cta";

export default function CommunityInvite({ spotsLeft }: { spotsLeft?: number }) {
  const founder =
    spotsLeft != null && spotsLeft > 0
      ? `${spotsLeft} of 100 founding spots left.`
      : spotsLeft === 0
        ? "All 100 founding spots claimed."
        : "Join free to see whether a founder spot is still open.";

  return (
    <section className="landing-community reveal-view" aria-labelledby="community-invite-title">
      <div className="landing-community-copy">
        <p>Invite</p>
        <h2 id="community-invite-title">
          Bring your classmates. Build a community that helps each other.
        </h2>
        <p>
          Share your invite link after you join. Friends who stay active count
          toward the rewards.
        </p>
      </div>

      <div className="landing-community-band">
        <article>
          <h3>Invite friends</h3>
          <p>
            50 active joins earn Social Butterfly. 100 also grants a free
            semester of Pro.
          </p>
          <Link href="/signup" className={signupCta}>
            Join to get a link
          </Link>
        </article>
        <article>
          <h3>First 100 students</h3>
          <p>
            A permanent founder mark for the first 100 accounts. {founder}
          </p>
          <Link href="/signup" className={ghostCta}>
            Join free
          </Link>
        </article>
      </div>
    </section>
  );
}
