// samehere — coming-soon landing. Lovable-style, warm cream (see DESIGN.md). Static + one client island.
import ProfileShowcase from "../components/ProfileShowcase";

// ponytail: inline SVG icons, no icon-lib dep
const I = "h-5 w-5";
const s = { fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, viewBox: "0 0 24 24" };
const IconGraph = () => (<svg className={I} {...s}><path d="M4 20V11" /><path d="M10 20V4" /><path d="M16 20v-6" /><path d="M2 20h20" /></svg>);
const IconSame = () => (<svg className={I} {...s}><circle cx="9" cy="12" r="5.5" /><circle cx="15" cy="12" r="5.5" /></svg>);
const IconHeart = () => (<svg className={I} {...s}><path d="M19 14c1.49-1.46 3-3.2 3-5.5A4.5 4.5 0 0 0 12 5.5 4.5 4.5 0 0 0 2 8.5c0 2.3 1.5 4.04 3 5.5l7 7Z" /></svg>);
const IconComment = () => (<svg className={I} {...s}><path d="M21 15a2 2 0 0 1-2 2H8l-4 4V5a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2Z" /></svg>);
const IconRepost = () => (<svg className={I} {...s}><path d="M17 2l4 4-4 4" /><path d="M3 11V9a4 4 0 0 1 4-4h14" /><path d="M7 22l-4-4 4-4" /><path d="M21 13v2a4 4 0 0 1-4 4H3" /></svg>);
const IconBookmark = () => (<svg className={I} {...s}><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2Z" /></svg>);
const IconShield = () => (<svg className={I} {...s}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" /><path d="M9 12l2 2 4-4" /></svg>);
const IconLock = () => (<svg className={I} {...s}><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>);
const IconUsers = () => (<svg className={I} {...s}><circle cx="9" cy="8" r="3.5" /><path d="M2 21v-1a6 6 0 0 1 12 0v1" /><path d="M16 5a3.5 3.5 0 0 1 0 7" /><path d="M22 21v-1a6 6 0 0 0-4-5.6" /></svg>);
const IconSparkle = () => (<svg className={I} {...s}><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3Z" /></svg>);

const card = "rounded-xl border border-[var(--border)] p-6";
const h2 = "text-3xl font-semibold leading-[1.05] tracking-[-0.025em] md:text-[40px]";
const muted = "text-[var(--ink-muted)]";

const FEATURES: [() => React.ReactElement, string, string][] = [
  [IconGraph, "Contribution heatmap", "Posts, comments, and connections build a graph on every profile."],
  [IconShield, "Verified .edu", "Every account confirmed by a school email before it exists."],
  [IconLock, "Privacy controls", "Go private, hide your school, control who sees your heatmap."],
  [IconUsers, "Follow your people", "Request, accept, and build a feed of students who get it."],
];

const AI: [string, string][] = [
  ["Peer matching", "Finish your profile and AI surfaces your 3 most compatible students, each with a score and reasoning."],
  ["Connection prompts", "AI writes one specific line on why two students should talk, drawn from their actual profiles."],
  ["Smart suggested follows", "The dashboard ranks who to follow by profile fit, not signup date."],
  ["Feed post prompts", "Open the composer and AI suggests what to post, personalized to you."],
];

const FAQ: [string, string][] = [
  ["When does it launch?", "Soon. Verified .edu students first. This is an early preview."],
  ["Is samehere free?", "Yes. Free for every verified student."],
  ["Who can join?", "Anyone with a valid .edu email. We verify it before you get an account."],
  ["Is my data private?", "You control it. Private accounts, a hideable school, and a heatmap you control. Logged-out visitors see nothing."],
];

export default function Home() {
  return (
    <main className="min-h-[100dvh]">
      {/* NAV */}
      <header className="sticky top-0 z-50 bg-[var(--canvas)]/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-5">
          <span className="text-lg font-semibold tracking-[-0.02em]">samehere</span>
          <span className="rounded-full border border-[var(--border-strong)] px-3 py-1 text-xs">Coming soon</span>
        </div>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden px-5 pt-24 pb-24 text-center">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[420px] opacity-60"
          style={{ background: "radial-gradient(40% 60% at 25% 20%, rgba(255,150,120,0.20), transparent), radial-gradient(45% 60% at 75% 15%, rgba(120,170,255,0.20), transparent), radial-gradient(50% 60% at 50% 0%, rgba(255,120,190,0.14), transparent)" }} />
        <div className="reveal relative mx-auto max-w-3xl">
          <p className="mb-6 inline-block rounded-full border border-[var(--border-strong)] px-4 py-1.5 text-sm">An early look at what we&apos;re building</p>
          <h1 className="text-balance text-5xl font-semibold leading-[1.02] tracking-[-0.03em] md:text-6xl">You&apos;re not the only one.</h1>
          <p className={`mx-auto mt-6 max-w-[46ch] text-lg leading-relaxed ${muted}`}>
            A network for verified college students. Share what you&apos;re building and find the people who say: same here.
          </p>
        </div>
        <div className="reveal relative mx-auto mt-14 max-w-md">
          <ProfileShowcase />
        </div>
      </section>

      {/* FEATURES + FEED */}
      <section className="mx-auto max-w-5xl px-5 py-20">
        <h2 className={`reveal max-w-[18ch] ${h2}`}>Everything a student profile should be.</h2>
        <div className="reveal mt-10 grid gap-4 md:grid-cols-3">
          {/* reactions */}
          <div className={card}>
            <span className="text-[var(--ink)]"><IconSame /></span>
            <h3 className="mt-4 text-lg">More than a like</h3>
            <p className={`mt-1.5 text-sm ${muted}`}>React the way you mean it — including <span className="text-[var(--blue)]">SameHere</span>, our &ldquo;this is me too&rdquo; reaction.</p>
            <div className="mt-4 flex flex-wrap items-start gap-x-4 gap-y-3">
              {([
                ["Like", <IconHeart key="h" />, false],
                ["SameHere", <IconSame key="s" />, true],
                ["Comment", <IconComment key="c" />, false],
                ["Repost", <IconRepost key="r" />, false],
                ["Save", <IconBookmark key="b" />, false],
              ] as [string, React.ReactElement, boolean][]).map(([label, icon, hi]) => (
                <div key={label} className={`flex flex-col items-center gap-1 ${hi ? "text-[var(--blue)]" : "text-[var(--ink-faint)]"}`}>
                  {icon}
                  <span className={`text-[10px] leading-none ${hi ? "font-medium" : ""}`}>{label}</span>
                </div>
              ))}
            </div>
          </div>
          {FEATURES.map(([Icon, t, d]) => (
            <div key={t} className={card}>
              <span className="text-[var(--ink)]"><Icon /></span>
              <h3 className="mt-4 text-lg">{t}</h3>
              <p className={`mt-1.5 text-sm ${muted}`}>{d}</p>
            </div>
          ))}
          {/* feed peek */}
          <div className={card}>
            <div className="flex items-center gap-2.5">
              <img src="https://picsum.photos/seed/marcus-samehere/64/64" alt="" className="h-8 w-8 rounded-full object-cover" />
              <div className="text-sm"><p className="font-medium leading-tight">Marcus Elu</p><p className={muted}>@marcuse · 2h</p></div>
            </div>
            <p className="mt-3 text-sm leading-relaxed">Failed two interviews this month, logged every question I bombed, drilled for three weeks, and just got the offer.</p>
            <div className="mt-3 flex items-center gap-4 text-[var(--ink-faint)]">
              <span title="Like"><IconHeart /></span>
              <span title="SameHere — this is me too" className="text-[var(--blue)]"><IconSame /></span>
              <span title="Comment"><IconComment /></span>
              <span title="Repost"><IconRepost /></span>
            </div>
          </div>
        </div>
      </section>

      {/* AI — roadmap */}
      <section className="mx-auto max-w-5xl px-5 py-20">
        <div className="reveal">
          <p className="inline-flex items-center gap-2 text-sm font-medium text-[var(--blue)]"><IconSparkle /> On the roadmap</p>
          <h2 className={`mt-2 ${h2}`}>AI that helps you find your people.</h2>
          <p className={`mt-3 max-w-[52ch] ${muted}`}>After launch, samehere turns a completed profile into real connections.</p>
        </div>
        <div className="reveal mt-10 grid gap-4 md:grid-cols-2">
          {AI.map(([t, d], i) => (
            <div key={t} className={card}>
              <h3 className="text-lg">{t}</h3>
              <p className={`mt-1.5 text-sm ${muted}`}>{d}</p>
              {i === 0 && (
                <div className="mt-4 flex items-center justify-between rounded-lg border border-[var(--border)] px-3 py-2 text-sm">
                  <span className="flex items-center gap-2"><img src="https://picsum.photos/seed/priya-samehere/48/48" alt="" className="h-6 w-6 rounded-full object-cover" /> Priya Raman</span>
                  <span className="font-semibold text-[var(--blue)]">91% match</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="mx-auto max-w-5xl px-5 py-20">
        <h2 className={`reveal ${h2}`}>Three steps in.</h2>
        <div className="reveal mt-10 grid gap-8 md:grid-cols-3">
          {[
            ["Verify your .edu", "Sign up with a school email. We confirm it first."],
            ["Build your profile", "Add your school, year, skills, and goals."],
            ["Post and follow", "Share updates, react, and connect."],
          ].map(([t, d], i) => (
            <div key={t}>
              <span className="text-2xl font-semibold text-[var(--ink-faint)]">0{i + 1}</span>
              <h3 className="mt-3 text-lg font-medium">{t}</h3>
              <p className={`mt-1.5 text-sm ${muted}`}>{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FOUNDER */}
      <section className="mx-auto max-w-3xl px-5 py-16">
        <div className="reveal flex flex-col items-center gap-4 text-center">
          <img src="https://picsum.photos/seed/dev-goswami/120/120" alt="" className="h-14 w-14 rounded-full object-cover" />
          <p className="max-w-[52ch] text-lg leading-relaxed">
            I built samehere because every other network felt like a performance. I wanted one place where
            students could be honest about the grind and find people a few steps ahead.
          </p>
          <p className="text-sm"><span className="font-semibold">Dev Goswami</span> <span className={muted}>· Founder</span></p>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-5 py-20">
        <h2 className={`reveal ${h2}`}>Questions.</h2>
        <div className="reveal mt-8 divide-y divide-[var(--border)] border-y border-[var(--border)]">
          {FAQ.map(([q, a]) => (
            <details key={q} className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">
                {q}
                <span className="text-xl leading-none text-[var(--ink-faint)] transition group-open:rotate-45">+</span>
              </summary>
              <p className={`mt-3 ${muted}`}>{a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="mx-auto max-w-5xl px-5 pb-14">
        <div className="rounded-2xl border border-[var(--border)] px-6 py-8 text-center">
          <p className="text-lg font-semibold tracking-[-0.02em]">samehere</p>
          <p className={`mx-auto mt-2 max-w-[34ch] text-sm ${muted}`}>The network for verified students. Built for the people figuring it out.</p>
          <p className="mt-3 text-sm text-[var(--ink-faint)]">Coming soon · © 2026 samehere</p>
        </div>
      </footer>
    </main>
  );
}
