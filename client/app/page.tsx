import Link from "next/link";
import { ArrowRight, GitBranch, MessageSquareCode, Search, Zap } from "lucide-react";
import { GitHubIcon } from "@/components/icons/github-icon";
import { HomeNav } from "@/components/layout/home-nav";
import { getGithubLoginUrl } from "@/lib/api";

export default function HomePage() {
  const githubUrl = getGithubLoginUrl();

  return (
    <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white overflow-x-hidden transition-colors duration-300">

      {/* ── NAV (client — has ModeToggle + useTheme) ── */}
      <HomeNav />

      {/* ── HERO ──────────────────────────────────────── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center text-center px-6 pt-14">
        {/* Radial glow */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(37,99,235,0.07),transparent)] dark:bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(37,99,235,0.12),transparent)]" />
        {/* Fine grid */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.025] dark:opacity-[0.04]"
          style={{
            backgroundImage: "linear-gradient(currentColor 1px,transparent 1px),linear-gradient(90deg,currentColor 1px,transparent 1px)",
            backgroundSize: "40px 40px",
            maskImage: "radial-gradient(ellipse 80% 60% at 50% 30%,black 20%,transparent 80%)",
          }}
        />

        <div className="relative z-10 max-w-4xl mx-auto space-y-8">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 border border-black/10 dark:border-white/10 rounded-full px-4 py-1.5 text-[12px] font-medium text-black/50 dark:text-white/50 animate-fade-up">
            <span className="size-1.5 rounded-full bg-green-500 inline-block" />
            RAG-powered GitHub code intelligence
          </div>

          {/* Headline */}
          <h1
            className="font-heading font-black leading-[0.9] tracking-[-0.045em] animate-fade-up animate-fade-up-1"
            style={{ fontSize: "clamp(52px,9vw,112px)" }}
          >
            Chat with<br />
            <span className="text-[#2563eb]">any codebase.</span>
          </h1>

          {/* Sub */}
          <p className="text-[18px] text-black/50 dark:text-white/50 max-w-md mx-auto leading-relaxed animate-fade-up animate-fade-up-2">
            Index your GitHub repo. Ask in plain English.<br />
            Get cited answers from your actual code.
          </p>

          {/* CTAs */}
          <div className="flex flex-wrap gap-3 items-center justify-center animate-fade-up animate-fade-up-3">
            <a
              href={githubUrl}
              className="inline-flex items-center gap-2.5 bg-black dark:bg-white text-white dark:text-black font-semibold text-[15px] px-7 py-3.5 rounded-full hover:opacity-80 transition-all hover:-translate-y-0.5 shadow-lg shadow-black/10 dark:shadow-white/5"
            >
              <GitHubIcon className="size-5" />
              Continue with GitHub
              <ArrowRight className="size-4" />
            </a>
            <a
              href="#how"
              className="inline-flex items-center gap-2 border border-black/15 dark:border-white/15 text-black/70 dark:text-white/70 font-medium text-[15px] px-7 py-3.5 rounded-full hover:border-black/30 dark:hover:border-white/30 hover:text-black dark:hover:text-white transition-all"
            >
              See how it works
            </a>
          </div>

          {/* Tech tags */}
          <div className="flex flex-wrap gap-2 justify-center animate-fade-up animate-fade-up-4">
            {["Spring Boot 4", "Next.js 16", "pgvector", "GPT-4o-mini", "GitHub OAuth"].map((t) => (
              <span key={t} className="text-[11px] font-mono font-medium px-3 py-1.5 rounded-full border border-black/8 dark:border-white/8 text-black/40 dark:text-white/40">
                {t}
              </span>
            ))}
          </div>
        </div>

        {/* Scroll line */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-0 animate-bounce opacity-30">
          <div className="w-[1px] h-12 bg-gradient-to-b from-transparent via-current to-transparent" />
        </div>
      </section>

      {/* ── PROBLEM / SOLUTION ────────────────────────── */}
      <section className="py-28 border-t border-black/6 dark:border-white/6">
        <div className="max-w-5xl mx-auto px-8">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <p className="font-mono text-[11px] tracking-[0.14em] uppercase text-black/30 dark:text-white/30 mb-5">The problem</p>
              <h2 className="font-heading font-black leading-[0.92] tracking-tight mb-6" style={{ fontSize: "clamp(36px,5vw,56px)" }}>
                Your code has<br />no memory.
              </h2>
              <p className="text-[16px] text-black/50 dark:text-white/50 leading-relaxed">
                Endless grepping. Stale docs. New devs taking weeks to ramp up.
                Your repo holds answers — but you can&#39;t ask it questions.
              </p>
            </div>
            <div className="border border-black/8 dark:border-white/8 rounded-2xl overflow-hidden">
              {[
                { before: "grep -r 'payment' --include='*.ts'", after: "How does payment retry work?" },
                { before: "Read 47 files to understand auth", after: "Who owns the auth module?" },
                { before: "Docs say X, code does Y", after: "What does this function actually do?" },
              ].map((row, i) => (
                <div key={i} className="grid grid-cols-2 divide-x divide-black/6 dark:divide-white/6 border-b border-black/6 dark:border-white/6 last:border-b-0">
                  <div className="p-4">
                    <p className="text-[11px] text-black/30 dark:text-white/30 font-mono mb-1">Before</p>
                    <p className="text-[13px] text-black/50 dark:text-white/50 font-mono">{row.before}</p>
                  </div>
                  <div className="p-4 bg-[#2563eb]/4 dark:bg-[#2563eb]/10">
                    <p className="text-[11px] text-[#2563eb]/60 font-mono mb-1">With GitSense</p>
                    <p className="text-[13px] text-black/70 dark:text-white/70 font-medium">{row.after}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ──────────────────────────────── */}
      <section id="how" className="py-28 border-t border-black/6 dark:border-white/6 bg-black/[0.02] dark:bg-white/[0.02]">
        <div className="max-w-5xl mx-auto px-8">
          <p className="font-mono text-[11px] tracking-[0.14em] uppercase text-black/30 dark:text-white/30 mb-5">How it works</p>
          <h2 className="font-heading font-black leading-[0.92] tracking-tight mb-16" style={{ fontSize: "clamp(36px,5vw,56px)" }}>
            Five steps.<br />
            <span className="text-[#2563eb]">One conversation.</span>
          </h2>
          <div className="grid md:grid-cols-5 border border-black/8 dark:border-white/8 rounded-2xl overflow-hidden">
            {[
              { n: "01", title: "GitHub Sync",   body: "OAuth login. Pick repos. Fetch the entire file tree.",       color: "#2563eb" },
              { n: "02", title: "Chunk & Parse", body: "Code-aware chunking that preserves function context.",        color: "#1d4ed8" },
              { n: "03", title: "Embed",          body: "all-MiniLM-L6-v2 → 384-dim vectors in pgvector.",           color: "#1e40af" },
              { n: "04", title: "Retrieve",       body: "Cosine similarity finds top-5 relevant chunks in ms.",      color: "#1e3a8a" },
              { n: "05", title: "Generate",       body: "LLM answers with exact citations, streamed via SSE.",        color: "#172554" },
            ].map((step) => (
              <div key={step.n} className="p-6 border-r border-black/6 dark:border-white/6 last:border-r-0 relative hover:bg-black/2 dark:hover:bg-white/2 transition-colors">
                <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: step.color }} />
                <p className="font-mono text-[10px] text-black/25 dark:text-white/25 mb-3 tracking-wider">{step.n}</p>
                <h3 className="font-heading font-bold text-[14px] mb-2 tracking-tight">{step.title}</h3>
                <p className="text-[12px] text-black/45 dark:text-white/45 leading-relaxed">{step.body}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 border border-black/8 dark:border-white/8 rounded-xl p-4 flex items-center gap-4 flex-wrap bg-black/[0.015] dark:bg-white/[0.015]">
            <code className="text-[12px] font-mono text-[#2563eb] bg-[#2563eb]/8 dark:bg-[#2563eb]/12 px-3 py-1.5 rounded-lg">
              POST /api/chat/sessions/&#123;id&#125;/messages → SSE
            </code>
            <span className="text-[13px] text-black/40 dark:text-white/40">
              Every answer is <strong className="text-black dark:text-white font-semibold">grounded</strong> in your actual code.
            </span>
            <div className="ml-auto flex gap-2">
              <span className="text-[11px] font-mono px-2.5 py-1 border border-black/8 dark:border-white/8 rounded-full text-black/40 dark:text-white/40">{"< 2s p95"}</span>
              <span className="text-[11px] font-mono px-2.5 py-1 border border-black/8 dark:border-white/8 rounded-full text-black/40 dark:text-white/40">100% cited</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── DEMO CHAT ─────────────────────────────────── */}
      <section className="py-28 border-t border-black/6 dark:border-white/6">
        <div className="max-w-5xl mx-auto px-8">
          <div className="grid md:grid-cols-2 gap-16 items-start">
            <div>
              <p className="font-mono text-[11px] tracking-[0.14em] uppercase text-black/30 dark:text-white/30 mb-5">Live demo</p>
              <h2 className="font-heading font-black leading-[0.92] tracking-tight mb-6" style={{ fontSize: "clamp(36px,4.5vw,52px)" }}>
                Ask anything.<br />
                <span className="text-[#2563eb]">Get answers</span><br />
                with receipts.
              </h2>
              <div className="space-y-4 mt-8">
                {[
                  { icon: MessageSquareCode, title: "Natural language", body: "Ask like you'd ask a teammate. No query syntax." },
                  { icon: Search,            title: "Cited every time",  body: "Every fact links to file + line. Verify in one click." },
                  { icon: Zap,               title: "Streaming replies", body: "Tokens arrive as generated. Feels instant." },
                  { icon: GitBranch,         title: "Private & secure",  body: "AES-encrypted OAuth tokens. Your code stays yours." },
                ].map((f) => (
                  <div key={f.title} className="flex gap-3 items-start">
                    <div className="size-8 rounded-lg border border-black/8 dark:border-white/8 grid place-items-center flex-shrink-0 mt-0.5 bg-black/[0.02] dark:bg-white/[0.02]">
                      <f.icon className="size-4 text-black/40 dark:text-white/40" />
                    </div>
                    <div>
                      <p className="font-semibold text-[14px] tracking-tight">{f.title}</p>
                      <p className="text-[13px] text-black/45 dark:text-white/45 mt-0.5">{f.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Chat window */}
            <div className="rounded-2xl border border-black/10 dark:border-white/10 overflow-hidden shadow-2xl shadow-black/6 dark:shadow-black/40">
              <div className="flex items-center gap-2 px-4 h-10 border-b border-black/6 dark:border-white/6 bg-black/[0.02] dark:bg-white/[0.02]">
                <span className="size-2.5 rounded-full bg-red-400" />
                <span className="size-2.5 rounded-full bg-amber-400" />
                <span className="size-2.5 rounded-full bg-green-400" />
                <span className="ml-2 text-[12px] text-black/30 dark:text-white/30 font-mono">GitSense — streaming</span>
                <span className="ml-auto text-[10px] font-mono px-2 py-0.5 rounded bg-[#2563eb]/8 text-[#2563eb] border border-[#2563eb]/15">nitinmehra09/myapp</span>
              </div>
              <div className="p-4 space-y-3 bg-white dark:bg-black min-h-[300px]">
                <div className="flex justify-end">
                  <div className="bg-black dark:bg-white text-white dark:text-black text-[13px] px-4 py-2.5 rounded-2xl rounded-br-md max-w-[80%] font-medium">
                    How does the payment retry logic work?
                  </div>
                </div>
                <div className="flex justify-start">
                  <div className="border border-black/8 dark:border-white/10 bg-black/[0.01] dark:bg-white/[0.03] text-[13px] px-4 py-3 rounded-2xl rounded-bl-md max-w-[85%] space-y-2">
                    <p>Retries in <strong className="text-[#2563eb]">payment/service.ts:88</strong> — exponential backoff (1s→2s→4s), max 3 attempts.</p>
                    <div className="border-l-2 border-[#2563eb]/30 pl-2 text-[11px] font-mono text-black/35 dark:text-white/30">
                      📎 payment/service.ts:88 · webhook.ts:21
                    </div>
                  </div>
                </div>
                <div className="flex justify-end">
                  <div className="bg-black dark:bg-white text-white dark:text-black text-[13px] px-4 py-2.5 rounded-2xl rounded-br-md max-w-[80%] font-medium">
                    Who owns the auth module?
                  </div>
                </div>
                <div className="flex justify-start">
                  <div className="border border-black/8 dark:border-white/10 bg-black/[0.01] dark:bg-white/[0.03] text-[13px] px-4 py-3 rounded-2xl rounded-bl-md max-w-[85%] space-y-2">
                    <p><strong className="text-[#2563eb]">@team-auth</strong> — last commit by nitin 2 days ago.</p>
                    <div className="border-l-2 border-[#2563eb]/30 pl-2 text-[11px] font-mono text-black/35 dark:text-white/30">
                      📎 CODEOWNERS:4 · auth/middleware.ts
                    </div>
                  </div>
                </div>
                <div className="flex justify-start">
                  <div className="border border-black/8 dark:border-white/10 px-4 py-3 rounded-2xl rounded-bl-md">
                    <div className="flex gap-1 items-center">
                      <span className="size-1.5 rounded-full bg-[#2563eb]/40 animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="size-1.5 rounded-full bg-[#2563eb]/40 animate-bounce" style={{ animationDelay: "120ms" }} />
                      <span className="size-1.5 rounded-full bg-[#2563eb]/40 animate-bounce" style={{ animationDelay: "240ms" }} />
                    </div>
                  </div>
                </div>
              </div>
              <div className="border-t border-black/6 dark:border-white/6 px-4 py-3 flex items-center gap-3 bg-black/[0.01] dark:bg-white/[0.01]">
                <div className="flex-1 text-[13px] text-black/25 dark:text-white/25 font-mono">Ask anything about this repo...</div>
                <div className="size-7 rounded-full bg-black dark:bg-white grid place-items-center cursor-pointer hover:opacity-70 transition-opacity">
                  <ArrowRight className="size-3.5 text-white dark:text-black" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── TECH STACK ────────────────────────────────── */}
      <section id="stack" className="py-28 border-t border-black/6 dark:border-white/6 bg-black/[0.02] dark:bg-white/[0.02]">
        <div className="max-w-5xl mx-auto px-8">
          <p className="font-mono text-[11px] tracking-[0.14em] uppercase text-black/30 dark:text-white/30 mb-5">Tech stack</p>
          <h2 className="font-heading font-black leading-[0.92] tracking-tight mb-12" style={{ fontSize: "clamp(36px,5vw,56px)" }}>
            Built to scale.
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 border border-black/8 dark:border-white/8 rounded-2xl overflow-hidden">
            {[
              { icon: "☕", name: "Spring Boot 4.1", sub: "Java 21 · Spring AI" },
              { icon: "▲",  name: "Next.js 16",      sub: "React 19 · TypeScript" },
              { icon: "🐘", name: "PostgreSQL",       sub: "pgvector · cosine" },
              { icon: "⚡", name: "Groq LLM",         sub: "GPT-4o-mini · SSE" },
              { icon: "🔐", name: "GitHub OAuth",     sub: "AES token encryption" },
              { icon: "🐳", name: "Docker",           sub: "one-command setup" },
              { icon: "🌊", name: "SSE Streaming",    sub: "real-time delivery" },
              { icon: "🔧", name: "TypeScript",       sub: "end-to-end safe" },
            ].map((s) => (
              <div key={s.name} className="p-5 border-b border-r border-black/6 dark:border-white/6 hover:bg-black/2 dark:hover:bg-white/2 transition-colors last:border-b-0 [&:nth-child(4n)]:border-r-0 [&:nth-last-child(-n+4)]:border-b-0">
                <div className="text-2xl mb-3 leading-none">{s.icon}</div>
                <p className="font-semibold text-[13px] tracking-tight">{s.name}</p>
                <p className="text-[11px] font-mono text-black/35 dark:text-white/35 mt-0.5">{s.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────── */}
      <section className="py-36 border-t border-black/6 dark:border-white/6 text-center relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_70%_at_50%_60%,rgba(37,99,235,0.06),transparent)] dark:bg-[radial-gradient(ellipse_70%_70%_at_50%_60%,rgba(37,99,235,0.10),transparent)]" />
        <div className="relative z-10 max-w-2xl mx-auto px-8 space-y-8">
          <h2 className="font-heading font-black leading-[0.9] tracking-tight" style={{ fontSize: "clamp(48px,7vw,80px)" }}>
            Your repo,<br />
            <span className="text-[#2563eb]">understood.</span>
          </h2>
          <p className="text-[18px] text-black/45 dark:text-white/45 leading-relaxed">
            Sync a repo. Ask a question. Get a cited answer.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <a
              href={githubUrl}
              className="inline-flex items-center gap-2.5 bg-black dark:bg-white text-white dark:text-black font-semibold text-[15px] px-8 py-4 rounded-full hover:opacity-80 transition-all hover:-translate-y-0.5 shadow-xl shadow-black/10 dark:shadow-white/5"
            >
              <GitHubIcon className="size-5" />
              Get started — it&#39;s free
              <ArrowRight className="size-4" />
            </a>
          </div>
          <div className="flex justify-center gap-12 pt-4">
            {[
              { val: "384", label: "vector dims" },
              { val: "18ms", label: "search latency" },
              { val: "100%", label: "cited answers" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <p className="font-heading font-black text-[28px] tracking-tight">{s.val}</p>
                <p className="text-[11px] font-mono uppercase tracking-widest text-black/30 dark:text-white/30 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────────── */}
      <footer className="border-t border-black/6 dark:border-white/6 px-8 py-6 flex items-center justify-between text-[12px] text-black/30 dark:text-white/30">
        <span>
          © 2026 GitSense · Built by{" "}
          <a href="https://nitinmehra.tech" target="_blank" rel="noreferrer" className="hover:text-black dark:hover:text-white transition-colors">
            Nitin Mehra
          </a>
        </span>
        <a href="https://github.com/nitinmehra09" target="_blank" rel="noreferrer" className="hover:text-black dark:hover:text-white transition-colors">
          github.com/nitinmehra09
        </a>
      </footer>
    </div>
  );
}
