'use client';
import * as React from 'react';
import { QueryClient, QueryClientProvider, keepPreviousData } from '@tanstack/react-query';

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false, // stop focus refresh
            refetchOnReconnect: false,
            retry: 1,
            staleTime: 5 * 60_000, // cache for 5m to reduce API calls
            gcTime: 30 * 60_000, // keep in cache for 30m
            placeholderData: keepPreviousData,
          },
          mutations: { retry: 0 },
        },
      })
  );

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
