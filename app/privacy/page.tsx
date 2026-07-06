import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
};

const UPDATED = "July 6, 2026";

export default function PrivacyPage() {
  return (
    <main className="page-enter mx-auto min-h-screen max-w-2xl bg-[var(--canvas)] px-5 py-20 text-[var(--ink)]">
      <h1 className="text-[36px] font-semibold leading-tight tracking-[-0.025em]">Privacy Policy</h1>
      <p className="mt-3 text-sm text-[var(--ink-muted)]">Last updated: {UPDATED}</p>

      <div className="mt-8 space-y-8 text-[15px] leading-relaxed text-[var(--ink-muted)]">
        <p>
          This Privacy Policy explains how samehere, operated by [LEGAL ENTITY NAME] (&ldquo;we&rdquo;,
          &ldquo;us&rdquo;), collects, uses, and shares information when you use the Service. By using
          samehere, you agree to this Policy.
        </p>

        <section>
          <h2 className="text-lg font-semibold text-[var(--ink)]">1. Information we collect</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              <strong className="text-[var(--ink)]">Account &amp; profile:</strong> your <code>.edu</code>{" "}
              email, username, display name, and any profile details you add (school, major, year, bio, skills,
              goals, courses, avatar).
            </li>
            <li>
              <strong className="text-[var(--ink)]">Content:</strong> posts, comments, reactions, reposts,
              bookmarks, direct messages, reports, and feedback you submit.
            </li>
            <li>
              <strong className="text-[var(--ink)]">Activity:</strong> on-platform contribution activity used
              for your heatmap and streak, profile views, follows, and referral activity.
            </li>
            <li>
              <strong className="text-[var(--ink)]">Billing:</strong> if you subscribe to Pro, our payment
              processor collects your payment details. We receive your subscription status and a customer
              identifier &mdash; not your full card number.
            </li>
            <li>
              <strong className="text-[var(--ink)]">Technical:</strong> standard log and device data (IP
              address, browser type, timestamps) collected by our hosting and infrastructure providers.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[var(--ink)]">2. How we use information</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>operate core features: profiles, feed, follows, messaging, heatmap, and search;</li>
            <li>verify eligibility (confirming a valid <code>.edu</code> email);</li>
            <li>power AI features such as connection suggestions and writing prompts;</li>
            <li>process Pro subscriptions and prevent fraud and abuse;</li>
            <li>maintain security, enforce rate limits, and respond to reports;</li>
            <li>communicate with you about your account and the Service.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[var(--ink)]">3. What others can see</h2>
          <p className="mt-2">
            Your profile and posts are visible to other signed-in students by default. Logged-out visitors
            cannot see profiles or content. You control visibility with account settings: private accounts
            require follow approval and hide their posts, comments, and follower lists from non-followers; you
            can also hide your school and restrict your heatmap to followers. Direct messages are visible only
            to you and the recipient. Bookmarks are private to you.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[var(--ink)]">4. Sharing &amp; service providers</h2>
          <p className="mt-2">
            We do not sell your personal information. We share data with vendors who process it on our behalf
            to run the Service:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              <strong className="text-[var(--ink)]">Supabase</strong> &mdash; database, authentication, and
              file storage;
            </li>
            <li>
              <strong className="text-[var(--ink)]">Vercel</strong> &mdash; application hosting and delivery;
            </li>
            <li>
              <strong className="text-[var(--ink)]">Stripe</strong> &mdash; payment processing for Pro;
            </li>
            <li>
              <strong className="text-[var(--ink)]">Anthropic</strong> (or an equivalent AI provider) &mdash;
              generating AI feature text.
            </li>
          </ul>
          <p className="mt-2">
            We may also disclose information if required by law or to protect the rights, safety, and security
            of our users and the Service.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[var(--ink)]">5. AI processing</h2>
          <p className="mt-2">
            When you use an AI feature, the relevant inputs (such as your own profile fields or a draft you are
            writing) are sent to our AI provider to generate a response. We do not send another user&rsquo;s
            private, non-follower-visible content into prompts on your behalf.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[var(--ink)]">6. Data retention &amp; deletion</h2>
          <p className="mt-2">
            We keep your information while your account is active. You can delete your account at any time from
            Settings, which removes your profile and associated Content. Some records may persist briefly in
            backups or where retention is required for legal, security, or billing purposes.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[var(--ink)]">7. Your rights</h2>
          <p className="mt-2">
            Depending on where you live, you may have rights to access, correct, export, or delete your
            personal information. You can exercise most of these directly in the app (edit profile, delete
            account) or by contacting us at the address below.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[var(--ink)]">8. Security</h2>
          <p className="mt-2">
            We use industry-standard measures including encrypted connections, row-level access controls, and
            server-side authorization. No system is perfectly secure, so we cannot guarantee absolute security.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[var(--ink)]">9. Changes &amp; contact</h2>
          <p className="mt-2">
            We may update this Policy from time to time and will revise the &ldquo;Last updated&rdquo; date
            above. For privacy questions or requests, contact{" "}
            <a href="mailto:[CONTACT EMAIL]" className="text-[var(--ink)] underline underline-offset-4">
              [CONTACT EMAIL]
            </a>
            .
          </p>
        </section>
      </div>

      <Link
        href="/"
        className="mt-12 inline-block text-sm text-[var(--ink)] underline-offset-4 transition hover:underline"
      >
        Back to home
      </Link>
    </main>
  );
}
