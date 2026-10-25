import type { IndexStatus, Repository } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function indexStatusLabel(status: IndexStatus) {
  switch (status) {
    case "READY":
      return "Ready";
    case "INDEXING":
      return "Indexing";
    case "FAILED":
      return "Failed";
    case "EXPIRED":
      return "Expired";
    default:
      return "Not indexed";
  }
}

export function IndexStatusBadge({
  status,
  className,
}: {
  status: IndexStatus;
  className?: string;
}) {
  const customStyles =
    status === "READY"
      ? "bg-emerald-500/15 text-emerald-700 border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30"
      : status === "FAILED"
      ? "bg-rose-500/15 text-rose-700 border-rose-500/30 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/30"
      : status === "INDEXING"
      ? "bg-blue-500/15 text-blue-700 border-blue-500/30 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/30"
      : status === "EXPIRED"
      ? "bg-amber-500/15 text-amber-700 border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30"
      : "bg-muted text-muted-foreground border-border dark:bg-white/[0.06] dark:text-zinc-400 dark:border-white/10";

  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1.5 font-medium shadow-none transition-colors",
        customStyles,
        className
      )}
    >
      {status === "READY" && (
        <span className="size-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
      )}
      {status === "INDEXING" && (
        <span className="size-1.5 animate-pulse rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
      )}
      {status === "FAILED" && (
        <span className="size-1.5 rounded-full bg-rose-500" />
      )}
      {indexStatusLabel(status)}
    </Badge>
  );
}

export function languageColor(language: string | null) {
  const map: Record<string, string> = {
    TypeScript: "bg-sky-500",
    JavaScript: "bg-amber-400",
    Java: "bg-orange-500",
    Python: "bg-emerald-500",
    Go: "bg-cyan-500",
    Rust: "bg-orange-700",
    Kotlin: "bg-violet-500",
  };
  return map[language ?? ""] ?? "bg-muted-foreground";
}

export function RepoMeta({ repo }: { repo: Repository }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
      {repo.language && (
        <span className="inline-flex items-center gap-1.5">
          <span
            className={cn("size-2 rounded-full", languageColor(repo.language))}
          />
          {repo.language}
        </span>
      )}
      <span>{repo.defaultBranch}</span>
      {repo.chunkCount > 0 && <span>{repo.chunkCount.toLocaleString()} chunks</span>}
    </div>
  );
}
