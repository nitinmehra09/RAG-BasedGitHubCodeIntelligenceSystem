"use client";

import { ModeToggle } from "@/components/ui/mode-toggle";
import { GitHubIcon } from "@/components/icons/github-icon";
import { getGithubLoginUrl } from "@/lib/api";

export function HomeNav() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 h-14 border-b border-black/6 dark:border-white/6 bg-white/85 dark:bg-black/85 backdrop-blur-xl transition-colors duration-300">
      {/* Brand */}
      <div className="flex items-center gap-2.5 font-semibold text-[15px] tracking-tight select-none">
        <svg width="28" height="28" viewBox="0 0 64 64" fill="none" aria-hidden="true" style={{ borderRadius: 8, flexShrink: 0 }}>
          <rect width="64" height="64" rx="14" fill="#2563eb" />
          <circle cx="22" cy="18" r="6" fill="white" />
          <circle cx="42" cy="18" r="6" fill="white" />
          <circle cx="22" cy="46" r="6" fill="white" />
          <path d="M22 24v10M22 34c0 5.5 4 9 9.5 9H42" stroke="white" strokeWidth="3.5" strokeLinecap="round" />
          <path d="M44 10l1.8 4L50 15.8l-4.2 1.8L44 22l-1.8-4.2L38 16l4.2-1.8z" fill="#fbbf24" />
        </svg>
        GitSense
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3">
        <a href="#how"   className="hidden sm:block text-[13px] text-black/45 dark:text-white/45 hover:text-black dark:hover:text-white transition-colors">How it works</a>
        <a href="#stack" className="hidden sm:block text-[13px] text-black/45 dark:text-white/45 hover:text-black dark:hover:text-white transition-colors">Stack</a>

        {/* Dark / Light / System toggle */}
        <ModeToggle />

        <a
          href={getGithubLoginUrl()}
          className="inline-flex items-center gap-2 bg-black dark:bg-white text-white dark:text-black text-[13px] font-semibold px-4 py-2 rounded-full hover:opacity-75 transition-opacity"
        >
          <GitHubIcon className="size-4" />
          <span className="hidden sm:inline">Sign in</span>
        </a>
      </div>
    </nav>
  );
}
