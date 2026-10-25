"use client";

import { formatDistanceToNow } from "date-fns";
import { MessageSquare, Plus, RotateCcw, Trash2 } from "lucide-react";
import { useState } from "react";

import { IndexStatusBadge } from "@/components/dashboard/repo-status";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useChatSessions,
  useCreateChatSession,
  useDeleteChatSession,
} from "@/hooks/use-chat";
import { useStartIndexing } from "@/hooks/use-repos";
import type { Repository } from "@/lib/api";
import { cn } from "@/lib/utils";

export function ChatSidebar({
  repo,
  sessionId,
  onSelectSession,
}: {
  repo: Repository;
  sessionId: string | null;
  onSelectSession: (id: string) => void;
}) {
  const ready = repo.indexStatus === "READY";
  const sessionsQuery = useChatSessions(repo.id, ready);
  const createSession = useCreateChatSession(repo.id);
  const deleteSession = useDeleteChatSession(repo.id);
  const reindex = useStartIndexing();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const sessions = sessionsQuery.data ?? [];

  function handleNewChat() {
    if (!ready || createSession.isPending) return;

    createSession.mutate(undefined, {
      onSuccess: (session) => {
        onSelectSession(session.id);
      },
    });
  }

  function handleDelete(e: React.MouseEvent, idToDelete: string) {
    e.stopPropagation();
    if (deleteSession.isPending) return;

    setDeletingId(idToDelete);
    deleteSession.mutate(idToDelete, {
      onSuccess: () => {
        setDeletingId(null);
        if (sessionId === idToDelete) {
          const remaining = sessions.filter((s) => s.id !== idToDelete);
          if (remaining.length > 0) {
            onSelectSession(remaining[0].id);
          } else {
            // No sessions left: create a fresh one
            createSession.mutate(undefined, {
              onSuccess: (s) => onSelectSession(s.id),
            });
          }
        }
      },
      onError: () => {
        setDeletingId(null);
      },
    });
  }

  return (
    <aside className="flex w-full flex-col border-b border-border/80 bg-card/40 backdrop-blur-md dark:border-white/[0.08] dark:bg-[#0c0d14]/80 md:w-72 md:border-r md:border-b-0">
      <div className="space-y-3 p-4">
        <div className="space-y-1.5">
          <p className="truncate text-sm font-semibold tracking-tight text-foreground">
            {repo.fullName}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <IndexStatusBadge status={repo.indexStatus} />
            {repo.isPrivate && (
              <span className="rounded-full border border-border/80 px-2 py-0.5 text-[11px] text-muted-foreground dark:border-white/10">
                Private
              </span>
            )}
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <Button
            size="sm"
            className="flex-1 shadow-sm transition-all dark:bg-primary dark:text-primary-foreground dark:hover:bg-primary/90"
            disabled={!ready || createSession.isPending}
            onClick={handleNewChat}
          >
            <Plus className="size-4" data-icon="inline-start" />
            New chat
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="shrink-0 dark:border-white/10 dark:hover:bg-white/[0.06]"
            disabled={reindex.isPending || repo.indexStatus === "INDEXING"}
            onClick={() => reindex.mutate(repo.id)}
            aria-label="Re-index repository"
            title="Re-index repository"
          >
            <RotateCcw className={cn("size-4", reindex.isPending && "animate-spin")} />
          </Button>
        </div>
      </div>

      <Separator className="dark:bg-white/[0.08]" />

      <div className="flex items-center justify-between px-4 py-2.5 text-xs font-medium text-muted-foreground">
        <span>Conversations</span>
        {sessions.length > 0 && (
          <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground dark:bg-white/[0.06]">
            {sessions.length}
          </span>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-1 px-2 pb-4">
          {!ready && (
            <p className="px-2 py-3 text-xs text-muted-foreground">
              Conversations unlock once indexing is complete.
            </p>
          )}

          {sessionsQuery.isLoading &&
            Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12 rounded-xl dark:bg-white/[0.05]" />
            ))}

          {sessions.map((session) => {
            const isSelected = sessionId === session.id;
            const isBeingDeleted = deletingId === session.id;

            return (
              <div
                key={session.id}
                role="button"
                tabIndex={0}
                onClick={() => onSelectSession(session.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    onSelectSession(session.id);
                  }
                }}
                className={cn(
                  "group relative flex cursor-pointer items-center justify-between gap-2 rounded-xl px-3 py-2.5 transition-all text-left outline-none",
                  isSelected
                    ? "bg-primary/10 text-primary border border-primary/20 dark:bg-white/[0.08] dark:border-white/[0.12] dark:text-white font-medium shadow-sm"
                    : "border border-transparent text-muted-foreground hover:bg-muted/60 hover:text-foreground dark:hover:bg-white/[0.04] dark:hover:text-zinc-200"
                )}
              >
                <div className="flex min-w-0 flex-1 items-start gap-2.5">
                  <MessageSquare
                    className={cn(
                      "mt-0.5 size-3.5 shrink-0 transition-colors",
                      isSelected
                        ? "text-primary dark:text-white"
                        : "text-muted-foreground/70 group-hover:text-foreground"
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium leading-snug">
                      {session.title || "New chat"}
                    </p>
                    <p className="text-[10px] text-muted-foreground/80">
                      {formatDistanceToNow(new Date(session.createdAt), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(e) => handleDelete(e, session.id)}
                  disabled={isBeingDeleted}
                  title="Delete conversation"
                  aria-label={`Delete ${session.title}`}
                  className={cn(
                    "shrink-0 rounded-lg p-1.5 transition-all text-muted-foreground hover:bg-destructive/10 hover:text-destructive dark:hover:bg-destructive/20",
                    isBeingDeleted
                      ? "opacity-100"
                      : "opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                  )}
                >
                  <Trash2 className={cn("size-3.5", isBeingDeleted && "animate-spin")} />
                </button>
              </div>
            );
          })}

          {ready && sessionsQuery.isSuccess && sessions.length === 0 && (
            <div className="px-3 py-6 text-center text-xs text-muted-foreground">
              <p>No conversations yet.</p>
              <p className="mt-1 text-[11px] opacity-80">Click “New chat” to start.</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </aside>
  );
}
