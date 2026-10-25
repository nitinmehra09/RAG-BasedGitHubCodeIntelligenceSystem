"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useCallback, useRef, useState } from "react";

import { api, type ChatMessage, type ChatSession } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { streamChatMessage } from "@/lib/stream-chat";
import { toast } from "@/components/ui/toast";

export function useChatSessions(repositoryId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.chat.sessions(repositoryId),
    queryFn: () => api.listSessions(repositoryId),
    enabled: Boolean(repositoryId) && enabled,
  });
}

export function useChatMessages(sessionId: string | null) {
  return useQuery({
    queryKey: queryKeys.chat.messages(sessionId ?? ""),
    queryFn: () => api.getMessages(sessionId!),
    enabled: Boolean(sessionId),
  });
}

export function useCreateChatSession(repositoryId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (title?: string) => api.createSession(repositoryId, title),
    onSuccess: (session) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.chat.sessions(repositoryId),
      });
      queryClient.setQueryData(queryKeys.chat.messages(session.id), []);
    },
    onError: (error: Error) => {
      toast.add({
        title: "Could not create chat",
        description: error.message,
        type: "error",
      });
    },
  });
}

export function useDeleteChatSession(repositoryId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (sessionId: string) => api.deleteSession(sessionId),
    onSuccess: (_, sessionId) => {
      queryClient.setQueryData<ChatSession[]>(
        queryKeys.chat.sessions(repositoryId),
        (current) => current?.filter((s) => s.id !== sessionId) ?? []
      );
      queryClient.removeQueries({
        queryKey: queryKeys.chat.messages(sessionId),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.chat.sessions(repositoryId),
      });
      toast.add({
        title: "Chat deleted",
        description: "The conversation was removed.",
        type: "info",
      });
    },
    onError: (error: Error) => {
      toast.add({
        title: "Could not delete chat",
        description: error.message,
        type: "error",
      });
    },
  });
}

export function useUpdateChatSessionTitle(repositoryId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ sessionId, title }: { sessionId: string; title: string }) =>
      api.updateSessionTitle(sessionId, title),
    onSuccess: (updated) => {
      queryClient.setQueryData<ChatSession[]>(
        queryKeys.chat.sessions(repositoryId),
        (current) =>
          current?.map((s) => (s.id === updated.id ? { ...s, title: updated.title } : s)) ?? []
      );
      void queryClient.invalidateQueries({
        queryKey: queryKeys.chat.sessions(repositoryId),
      });
    },
  });
}

export function useStreamChat(sessionId: string | null, repositoryId?: string) {
  const queryClient = useQueryClient();
  const [streaming, setStreaming] = useState(false);
  const [streamText, setStreamText] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  const send = useCallback(
    async (content: string) => {
      if (!sessionId || !content.trim() || streaming) return;

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const optimisticId = `temp-${Date.now()}`;
      const trimmed = content.trim();
      const optimistic: ChatMessage = {
        id: optimisticId,
        role: "USER",
        content: trimmed,
        citations: [],
        createdAt: new Date().toISOString(),
      };

      queryClient.setQueryData<ChatMessage[]>(
        queryKeys.chat.messages(sessionId),
        (prev) => [...(prev ?? []), optimistic]
      );

      // Optimistically update session title if it was "New chat" or "Chat with ..."
      if (repositoryId) {
        const smartTitle = trimmed.length > 50 ? trimmed.slice(0, 47) + "…" : trimmed;
        queryClient.setQueryData<ChatSession[]>(
          queryKeys.chat.sessions(repositoryId),
          (current) =>
            current?.map((s) =>
              s.id === sessionId &&
              (!s.title || s.title === "New chat" || s.title.startsWith("Chat with "))
                ? { ...s, title: smartTitle }
                : s
            ) ?? []
        );
      }

      setStreaming(true);
      setStreamText("");

      try {
        await streamChatMessage(sessionId, trimmed, {
          signal: controller.signal,
          onUserMessage: (message) => {
            queryClient.setQueryData<ChatMessage[]>(
              queryKeys.chat.messages(sessionId),
              (prev) => [
                ...(prev ?? []).filter((m) => m.id !== optimisticId),
                message,
              ]
            );
          },
          onToken: (token) => {
            setStreamText((prev) => prev + token);
          },
          onAssistantMessage: (message) => {
            queryClient.setQueryData<ChatMessage[]>(
              queryKeys.chat.messages(sessionId),
              (prev) => [...(prev ?? []), message]
            );
            setStreamText("");
            if (repositoryId) {
              void queryClient.invalidateQueries({
                queryKey: queryKeys.chat.sessions(repositoryId),
              });
            }
          },
          onError: (err) => {
            console.error("Stream SSE error:", err);
            toast.add({
              title: "AI Response Error",
              description: err.message,
              type: "error",
            });
            queryClient.setQueryData<ChatMessage[]>(
              queryKeys.chat.messages(sessionId),
              (prev) => (prev ?? []).filter((m) => m.id !== optimisticId)
            );
            setStreamText("");
          },
        });
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        toast.add({
          title: "Message failed",
          description: err instanceof Error ? err.message : "Unknown error",
          type: "error",
        });
        queryClient.setQueryData<ChatMessage[]>(
          queryKeys.chat.messages(sessionId),
          (prev) => (prev ?? []).filter((m) => m.id !== optimisticId)
        );
        setStreamText("");
      } finally {
        setStreaming(false);
      }
    },
    [sessionId, streaming, queryClient, repositoryId]
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
    setStreaming(false);
  }, []);

  return { send, stop, streaming, streamText };
}
