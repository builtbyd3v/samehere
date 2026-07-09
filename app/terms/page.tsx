import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
};

const UPDATED = "July 6, 2026";

export default function TermsPage() {
  return (
    <main className="page-enter mx-auto min-h-screen max-w-2xl bg-[var(--canvas)] px-5 py-20 text-[var(--ink)]">
      <h1 className="text-[36px] font-semibold leading-tight tracking-[-0.025em]">Terms of Service</h1>
      <p className="mt-3 text-sm text-[var(--ink-muted)]">Last updated: {UPDATED}</p>

      <div className="mt-8 space-y-8 text-[15px] leading-relaxed text-[var(--ink-muted)]">
        <p>
          These Terms of Service (&ldquo;Terms&rdquo;) govern your access to and use of samehere (the
          &ldquo;Service&rdquo;), operated by Devgiri Goswami (&ldquo;we&rdquo;, &ldquo;us&rdquo;). By
          creating an account or using the Service, you agree to these Terms. If you do not agree, do not use
          the Service.
        </p>

        <section>
          <h2 className="text-lg font-semibold text-[var(--ink)]">1. Eligibility</h2>
          <p className="mt-2">
            samehere is open to everyone and built for students. To create an account you must be at least 18
            years old. If you verify a school-issued email address ending in <code>.edu</code>, at signup or
            later in settings, you receive a verified student badge on your profile. A confirmed{" "}
            <code>.edu</code> email is not a guarantee of current enrollment, and we may suspend accounts or
            remove badges we reasonably believe are ineligible or fraudulent.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[var(--ink)]">2. Your account</h2>
          <p className="mt-2">
            You are responsible for the activity on your account and for keeping your password secure. Choose a
            username that is available and not misleading; reserved and impersonating usernames are not allowed.
            Notify us promptly of any unauthorized use.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[var(--ink)]">3. Your content</h2>
          <p className="mt-2">
            You retain ownership of the posts, comments, messages, media, and profile information you submit
            (&ldquo;Content&rdquo;). You grant us a non-exclusive, worldwide, royalty-free license to host,
            store, display, and distribute your Content solely to operate and improve the Service. You are
            responsible for your Content and represent that you have the rights to share it.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[var(--ink)]">4. Acceptable use</h2>
          <p className="mt-2">You agree not to:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>post unlawful, harassing, hateful, or infringing content;</li>
            <li>impersonate others or misrepresent your affiliation;</li>
            <li>spam, scrape, or attempt to access data or accounts that are not yours;</li>
            <li>probe, disrupt, or circumvent the security or rate limits of the Service;</li>
            <li>upload malware or use the Service to harm minors or other users.</li>
          </ul>
          <p className="mt-2">
            We may remove Content and suspend or terminate accounts that violate these Terms. You can report
            content in-app; reports are reviewed manually.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[var(--ink)]">5. AI features</h2>
          <p className="mt-2">
            Some features generate text using third-party AI models (for example, connection suggestions,
            writing prompts, and message drafts). AI output may be inaccurate and is provided as-is. We do not
            send another user&rsquo;s private content into prompts on your behalf. Do not rely on AI output as
            professional advice.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[var(--ink)]">6. samehere Pro &amp; billing</h2>
          <p className="mt-2">
            samehere Pro is an optional paid subscription. Current pricing is $4.99 per month or $12.99 per
            semester, billed in advance through our payment processor, Stripe. Subscriptions renew
            automatically for the same term until cancelled. You can cancel anytime from your account settings
            or the Stripe customer portal; cancellation stops future renewals and your Pro access continues
            through the end of the current paid period. Except where required by law, payments are
            non-refundable. Prices may change with notice for future terms.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[var(--ink)]">7. Termination</h2>
          <p className="mt-2">
            You may delete your account at any time from Settings, which removes your profile and associated
            Content. We may suspend or terminate your access for violations of these Terms. Sections that by
            their nature should survive termination (ownership, disclaimers, limitation of liability) will
            survive.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[var(--ink)]">8. Disclaimers</h2>
          <p className="mt-2">
            The Service is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo; without warranties of
            any kind, whether express or implied, including fitness for a particular purpose and
            non-infringement. We do not warrant that the Service will be uninterrupted, secure, or error-free.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[var(--ink)]">9. Limitation of liability</h2>
          <p className="mt-2">
            To the maximum extent permitted by law, we will not be liable for any indirect, incidental,
            special, consequential, or punitive damages, or for lost profits or data, arising from your use of
            the Service. Our total liability for any claim will not exceed the greater of the amount you paid us
            in the twelve months before the claim or $50.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[var(--ink)]">10. Changes to these Terms</h2>
          <p className="mt-2">
            We may update these Terms from time to time. If we make material changes, we will update the
            &ldquo;Last updated&rdquo; date and, where appropriate, notify you. Continued use after changes
            take effect means you accept the revised Terms.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[var(--ink)]">11. Governing law &amp; contact</h2>
          <p className="mt-2">
            These Terms are governed by the laws of the State of Florida, United States, without regard to conflict-of-laws rules.
            Questions about these Terms can be sent to{" "}
            <a href="mailto:support@samehere.dev" className="text-[var(--ink)] underline underline-offset-4">
              support@samehere.dev
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
