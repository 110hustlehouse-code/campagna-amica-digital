import { QueryClient } from '@tanstack/react-query';

// Data considered fresh for 10 minutes, kept in cache for 60 minutes.
const STALE_TIME = 10 * 60 * 1000;  // 10 min
const CACHE_TIME = 60 * 60 * 1000;  // 60 min

export const queryClientInstance = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      retry: 1,
      staleTime: STALE_TIME,
      gcTime: CACHE_TIME,
    },
  },
});