"use client";

import { UserRound } from "lucide-react";
import { useEffect, useRef } from "react";

import { ChatMarkdown } from "@/components/chat/chat-markdown";
import { CitationChips } from "@/components/chat/citation-chips";
import { DevPilotIcon } from "@/components/icons/devpilot-icon";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Bubble, BubbleContent } from "@/components/ui/bubble";
import {
  Message,
  MessageAvatar,
  MessageContent,
  MessageFooter,
  MessageGroup,
} from "@/components/ui/message";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import type { ChatMessage, Repository } from "@/lib/api";
import { cn } from "@/lib/utils";

export function ChatMessages({
  repo,
  messages,
  streaming = false,
  streamText,
  isLoading,
}: {
  repo: Repository;
  messages: ChatMessage[];
  streaming?: boolean;
  streamText?: string;
  isLoading?: boolean;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamText, streaming]);

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-6">
        <Skeleton className="h-16 w-2/3 rounded-3xl dark:bg-white/[0.05]" />
        <Skeleton className="ml-auto h-12 w-1/2 rounded-3xl dark:bg-white/[0.05]" />
        <Skeleton className="h-24 w-3/4 rounded-3xl dark:bg-white/[0.05]" />
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6">
        {messages.length === 0 && !streamText && !streaming && (
          <div className="rounded-2xl border border-border/80 bg-card/60 px-6 py-12 text-center backdrop-blur-md dark:border-white/[0.08] dark:bg-[#10121a]/70">
            <p className="font-semibold text-foreground">Ask anything about this codebase</p>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Try “Where is authentication handled?” or “Explain the repository
              indexing flow.”
            </p>
          </div>
        )}

        <MessageGroup>
          {messages.map((message) => {
            const isUser = message.role === "USER";
            return (
              <Message key={message.id} align={isUser ? "end" : "start"}>
                <MessageAvatar>
                  <Avatar className="size-8">
                    <AvatarFallback
                      className={cn(
                        isUser
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "bg-teal-500/10 text-teal-600 dark:bg-teal-500/15 dark:text-teal-300"
                      )}
                    >
                      {isUser ? (
                        <UserRound className="size-4" />
                      ) : (
                        <DevPilotIcon className="size-5" />
                      )}
                    </AvatarFallback>
                  </Avatar>
                </MessageAvatar>
                <MessageContent>
                  <Bubble
                    variant={isUser ? "default" : "muted"}
                    align={isUser ? "end" : "start"}
                    className={cn(!isUser && "max-w-full")}
                  >
                    <BubbleContent
                      className={cn(
                        "rounded-2xl px-4 py-3 text-sm leading-relaxed",
                        isUser
                          ? "bg-primary text-primary-foreground shadow-sm shadow-blue-500/20"
                          : "w-full max-w-full border border-border/60 bg-card/90 shadow-sm backdrop-blur-md dark:border-white/[0.08] dark:bg-[#12141f]/90 dark:shadow-[0_4px_24px_-4px_rgba(0,0,0,0.5),inset_0_1px_0_0_rgba(255,255,255,0.05)]"
                      )}
                    >
                      {isUser ? (
                        <span className="whitespace-pre-wrap">
                          {message.content}
                        </span>
                      ) : (
                        <ChatMarkdown content={message.content} />
                      )}
                    </BubbleContent>
                  </Bubble>
                  {!isUser && message.citations?.length > 0 && (
                    <MessageFooter>
                      <CitationChips repo={repo} citations={message.citations} />
                    </MessageFooter>
                  )}
                </MessageContent>
              </Message>
            );
          })}

          {(streaming || Boolean(streamText)) && (
            <Message align="start">
              <MessageAvatar>
                <Avatar className="size-8">
                  <AvatarFallback className="bg-teal-500/10 text-teal-600 dark:bg-teal-500/15 dark:text-teal-300">
                    <DevPilotIcon
                      className={cn("size-5", streaming && "animate-pulse")}
                    />
                  </AvatarFallback>
                </Avatar>
              </MessageAvatar>
              <MessageContent>
                <Bubble variant="muted" align="start" className="max-w-full">
                  <BubbleContent className="w-full max-w-full rounded-2xl border border-border/60 bg-card/90 px-4 py-3 shadow-sm backdrop-blur-md dark:border-white/[0.08] dark:bg-[#12141f]/90 dark:shadow-[0_4px_24px_-4px_rgba(0,0,0,0.5),inset_0_1px_0_0_rgba(255,255,255,0.05)]">
                    {streamText ? (
                      <>
                        <ChatMarkdown content={streamText} isStreaming />
                        {streaming && (
                          <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse rounded-sm bg-primary align-middle" />
                        )}
                      </>
                    ) : (
                      <div className="flex items-center gap-3 py-1">
                        <div className="relative flex size-6 shrink-0 items-center justify-center">
                          <DevPilotIcon
                            className="size-5 animate-spin text-teal-600 dark:text-teal-400"
                            style={{ animationDuration: "2.5s" }}
                          />
                        </div>
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <span className="font-medium text-foreground/80">
                            Searching repository & thinking
                          </span>
                          <span className="inline-flex items-center gap-0.5">
                            <span className="size-1 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]" />
                            <span className="size-1 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]" />
                            <span className="size-1 animate-bounce rounded-full bg-muted-foreground" />
                          </span>
                        </div>
                      </div>
                    )}
                  </BubbleContent>
                </Bubble>
              </MessageContent>
            </Message>
          )}
        </MessageGroup>
        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  );
}
