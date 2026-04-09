"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useRef, type ReactNode } from "react";

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
      },
    },
  });
}

export function QueryProvider({ children }: { children: ReactNode }) {
  const clientRef = useRef<QueryClient>(undefined);
  if (!clientRef.current) {
    clientRef.current = makeQueryClient();
  }
  return (
    <QueryClientProvider client={clientRef.current}>
      {children}
    </QueryClientProvider>
  );
}
