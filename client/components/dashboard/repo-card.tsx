"use client";

import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Clock,
  ExternalLink,
  GitBranch,
  Lock,
  MessageSquare,
  RotateCcw,
  Sparkles,
} from "lucide-react";

import { IndexErrorAlert } from "@/components/dashboard/index-error-alert";
import { LanguageBadge } from "@/components/dashboard/language-badge";
import { IndexStatusBadge } from "@/components/dashboard/repo-status";
import { LanguageIcon } from "@/components/icons/language-icon";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";
import { getRepoProgress, useStartIndexing } from "@/hooks/use-repos";
import type { Repository } from "@/lib/api";
import { cn } from "@/lib/utils";

export function RepoCard({ repo }: { repo: Repository }) {
  const router = useRouter();
  const indexMutation = useStartIndexing();
  const isIndexing = repo.indexStatus === "INDEXING" || indexMutation.isPending;
  const isFailed = repo.indexStatus === "FAILED";
  const isExpired = repo.indexStatus === "EXPIRED";
  const progress = getRepoProgress(repo);

  function openChat() {
    router.push(`/chat/${repo.id}`);
  }

  function handlePrimary() {
    if (repo.indexStatus === "READY") {
      openChat();
      return;
    }
    indexMutation.mutate(repo.id, {
      onSuccess: () => router.push(`/chat/${repo.id}`),
    });
  }

  return (
    <article
      className={cn(
        "group animate-fade-up flex flex-col overflow-hidden rounded-2xl border bg-card/90 transition-all",
        "shadow-sm dark:bg-[#0f1118]/85 dark:backdrop-blur-md dark:shadow-[0_4px_24px_-4px_rgba(0,0,0,0.5),inset_0_1px_0_0_rgba(255,255,255,0.05)]",
        isFailed
          ? "border-destructive/30 bg-destructive/2 hover:border-destructive/40 dark:border-destructive/30"
          : isExpired
            ? "border-amber-500/30 bg-amber-500/2 hover:border-amber-500/40 dark:border-amber-500/30"
            : "border-border/80 hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-md dark:border-white/[0.08] dark:hover:border-white/[0.18] dark:hover:bg-[#131622]/90"
      )}
    >
      <div className="border-b border-border/70 p-4 dark:border-white/[0.06]">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <LanguageBadge language={repo.language} showLabel={false} />
            <div className="min-w-0">
              <p className="truncate text-xs text-muted-foreground">{repo.owner}</p>
              <h3 className="truncate font-semibold tracking-tight text-foreground">{repo.name}</h3>
            </div>
          </div>
          <IndexStatusBadge status={repo.indexStatus} />
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3.5 p-4">
        {!isFailed && (
          <p className="line-clamp-2 min-h-10 text-sm text-muted-foreground leading-relaxed">
            {repo.description || "No description provided."}
          </p>
        )}

        {isFailed && repo.description && (
          <p className="line-clamp-1 text-sm text-muted-foreground">
            {repo.description}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          {repo.isPrivate && (
            <span className="inline-flex items-center gap-1 rounded-full border border-border/80 px-2.5 py-0.5 text-xs text-muted-foreground dark:border-white/10 dark:bg-white/[0.03]">
              <Lock className="size-3" />
              Private
            </span>
          )}
          <span className="inline-flex items-center gap-1 rounded-full border border-border/80 px-2.5 py-0.5 text-xs text-muted-foreground dark:border-white/10 dark:bg-white/[0.03]">
            <GitBranch className="size-3" />
            {repo.defaultBranch}
          </span>
          {repo.language && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border/80 px-2.5 py-0.5 text-xs dark:border-white/10 dark:bg-white/[0.03]">
              <LanguageIcon language={repo.language} size="sm" />
              {repo.language}
            </span>
          )}
          {repo.chunkCount > 0 && (
            <span
              className={cn(
                "rounded-full border border-border/80 px-2.5 py-0.5 text-xs dark:border-white/10 dark:bg-white/[0.03]",
                isFailed
                  ? "border-destructive/20 text-destructive/80"
                  : "text-muted-foreground"
              )}
            >
              {repo.chunkCount.toLocaleString()} chunks
              {isFailed ? " indexed" : ""}
            </span>
          )}
        </div>

        {isIndexing && (
          <div className="space-y-2 rounded-xl border border-blue-500/20 bg-blue-500/5 p-3 dark:border-blue-500/30 dark:bg-blue-500/10">
            <div className="flex items-center justify-between text-xs text-blue-600 dark:text-blue-300">
              <span className="font-medium">Indexing repository…</span>
              <span>
                {repo.filesProcessed}/{repo.filesTotal || "?"}
              </span>
            </div>
            <Progress value={progress || 8} />
          </div>
        )}

        {isFailed && repo.errorMessage && (
          <IndexErrorAlert message={repo.errorMessage} />
        )}

        {isExpired && (
          <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-600 dark:text-amber-400">
            <Clock className="mt-0.5 size-3.5 shrink-0" />
            <span>
              This repository&apos;s index expired after {5} days. Re-index it
              to ask questions again.
            </span>
          </div>
        )}
      </div>

      <div className="mt-auto flex items-center justify-between gap-2 border-t border-border/70 p-4 dark:border-white/[0.06]">
        {repo.htmlUrl ? (
          <Button
            variant="ghost"
            size="sm"
            nativeButton={false}
            className="text-xs text-muted-foreground hover:text-foreground dark:hover:bg-white/[0.05]"
            render={<a href={repo.htmlUrl} target="_blank" rel="noreferrer" />}
          >
            <ExternalLink className="size-3.5" data-icon="inline-start" />
            GitHub
          </Button>
        ) : (
          <span />
        )}

        <div className="flex gap-2">
          {repo.indexStatus === "READY" && (
            <Button
              variant="outline"
              size="sm"
              onClick={openChat}
              className="text-xs font-medium dark:border-white/10 dark:bg-white/[0.04] dark:hover:bg-white/[0.08]"
            >
              <MessageSquare className="size-3.5" data-icon="inline-start" />
              Chat
            </Button>
          )}
          <Button
            size="sm"
            variant={isFailed ? "outline" : "default"}
            className={cn(
              "text-xs font-medium shadow-sm transition-all",
              isFailed
                ? "border-destructive/30 text-destructive hover:bg-destructive/10"
                : "dark:bg-primary dark:text-primary-foreground dark:hover:bg-primary/90"
            )}
            disabled={isIndexing}
            onClick={handlePrimary}
          >
            {isIndexing ? (
              <>
                <Spinner data-icon="inline-start" />
                Indexing
              </>
            ) : repo.indexStatus === "READY" ? (
              <>
                Open
                <ArrowRight className="size-3.5" data-icon="inline-end" />
              </>
            ) : isFailed ? (
              <>
                <RotateCcw className="size-3.5" data-icon="inline-start" />
                Retry
              </>
            ) : isExpired ? (
              <>
                <RotateCcw className="size-3.5" data-icon="inline-start" />
                Re-index
              </>
            ) : (
              <>
                <Sparkles className="size-3.5" data-icon="inline-start" />
                Index
              </>
            )}
          </Button>
        </div>
      </div>
    </article>
  );
}
