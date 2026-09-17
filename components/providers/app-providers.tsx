"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Suspense, useState } from "react";
import { Toaster } from "sonner";
import { NavigationProgress } from "@/components/layout/navigation-progress";

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <Suspense fallback={null}>
        <NavigationProgress />
      </Suspense>
      {children}
      <Toaster richColors position="top-right" />
    </QueryClientProvider>
  );
}
