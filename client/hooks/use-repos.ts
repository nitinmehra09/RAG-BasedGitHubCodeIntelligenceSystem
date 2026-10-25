"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api, type Repository } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { toast } from "@/components/ui/toast";

const INDEXING_POLL_MS = 2000;

// Track active indexing toast IDs by repoId
const activeIndexingToasts = new Map<string, string>();

export function notifyIndexingComplete(
  repoId: string,
  fullName: string,
  status: string,
  errorMessage?: string | null
) {
  const toastId = activeIndexingToasts.get(repoId);
  if (!toastId) return;

  activeIndexingToasts.delete(repoId);

  if (status === "READY") {
    toast.update(toastId, {
      title: "Indexing complete",
      description: `${fullName} is ready for chat!`,
      type: "success",
    });
    setTimeout(() => {
      toast.close(toastId);
    }, 4000);
  } else if (status === "FAILED") {
    toast.update(toastId, {
      title: "Indexing failed",
      description: errorMessage || `Failed to index ${fullName}`,
      type: "error",
    });
    setTimeout(() => {
      toast.close(toastId);
    }, 6000);
  }
}

function hasIndexingRepos(repos: Repository[] | undefined) {
  return repos?.some((repo) => repo.indexStatus === "INDEXING") ?? false;
}

function updateRepoInListCache(
  queryClient: ReturnType<typeof useQueryClient>,
  repo: Repository
) {
  queryClient.setQueryData<Repository[]>(queryKeys.repos.list(), (current) => {
    if (!current) return current;
    return current.map((item) => (item.id === repo.id ? repo : item));
  });
}

export function useRepos() {
  const query = useQuery({
    queryKey: queryKeys.repos.list(),
    queryFn: async () => {
      const repos = await api.listRepos(false);
      if (repos.length === 0) {
        return api.listRepos(true);
      }
      return repos;
    },
    staleTime: 30_000,
    refetchInterval: (q) =>
      hasIndexingRepos(q.state.data) ? INDEXING_POLL_MS : false,
  });

  if (query.data) {
    for (const repo of query.data) {
      if (activeIndexingToasts.has(repo.id)) {
        if (repo.indexStatus === "READY" || repo.indexStatus === "FAILED") {
          notifyIndexingComplete(repo.id, repo.fullName, repo.indexStatus, repo.errorMessage);
        }
      }
    }
  }

  return query;
}

export function useRepository(repoId: string) {
  const query = useQuery({
    queryKey: queryKeys.repos.detail(repoId),
    queryFn: () => api.getRepo(repoId),
    enabled: Boolean(repoId),
    refetchInterval: (q) =>
      q.state.data?.indexStatus === "INDEXING" ? INDEXING_POLL_MS : false,
  });

  if (query.data && activeIndexingToasts.has(repoId)) {
    if (query.data.indexStatus === "READY" || query.data.indexStatus === "FAILED") {
      notifyIndexingComplete(repoId, query.data.fullName, query.data.indexStatus, query.data.errorMessage);
    }
  }

  return query;
}

export function useIndexStatus(repoId: string, enabled = false) {
  const query = useQuery({
    queryKey: queryKeys.repos.status(repoId),
    queryFn: () => api.indexStatus(repoId),
    enabled: Boolean(repoId) && enabled,
    refetchInterval: (q) =>
      !q.state.data || q.state.data?.indexStatus === "INDEXING"
        ? 1500
        : false,
  });

  if (query.data && activeIndexingToasts.has(repoId)) {
    const status = query.data.indexStatus;
    if (status === "READY" || status === "FAILED") {
      notifyIndexingComplete(repoId, "Repository", status, query.data.errorMessage);
    }
  }

  return query;
}

export function useStartIndexing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (repoId: string) => api.startIndex(repoId),
    onSuccess: (repo) => {
      queryClient.setQueryData(queryKeys.repos.detail(repo.id), repo);
      updateRepoInListCache(queryClient, repo);
      void queryClient.invalidateQueries({
        queryKey: queryKeys.repos.status(repo.id),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.repos.detail(repo.id),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.repos.list(),
      });

      const toastId = `indexing-${repo.id}-${Date.now()}`;
      activeIndexingToasts.set(repo.id, toastId);

      toast.add({
        id: toastId,
        title: "Indexing started",
        description: `Indexing ${repo.fullName}…`,
        type: "loading",
      });

      // 120s safety timeout to ensure popup never stays forever
      setTimeout(() => {
        if (activeIndexingToasts.get(repo.id) === toastId) {
          activeIndexingToasts.delete(repo.id);
          toast.close(toastId);
        }
      }, 120_000);
    },
    onError: (error: Error) => {
      toast.add({
        title: "Could not start indexing",
        description: error.message,
        type: "error",
      });
    },
  });
}

export function useRefreshRepos() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      toast.promise(api.listRepos(true), {
        loading: {
          title: "Syncing repositories",
          description: "Fetching the latest repos from GitHub…",
          type: "loading",
        },
        success: (repos) => ({
          title: "Sync successful",
          description: `${repos.length} repositories loaded`,
          type: "success",
        }),
        error: (error: Error) => ({
          title: "Sync failed",
          description:
            error instanceof Error ? error.message : "Could not sync repositories",
          type: "error",
        }),
      }),
    onSuccess: (repos) => {
      queryClient.setQueryData(queryKeys.repos.list(), repos);
    },
  });
}

export function getRepoProgress(repo: Pick<
  Repository,
  "filesProcessed" | "filesTotal"
>) {
  if (!repo.filesTotal) return 0;
  return Math.min(100, Math.round((repo.filesProcessed / repo.filesTotal) * 100));
}
