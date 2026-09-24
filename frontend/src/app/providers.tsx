'use client';

import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useSessionExpiredHandler } from '@/features/core/auth/auth.hooks';

function SessionExpiredHandler() {
  useSessionExpiredHandler();
  return null;
}

// 1 QueryClient/tab trình duyệt (useState lazy init) — không tạo lại giữa các render.
export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000, retry: 1 },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <SessionExpiredHandler />
      {children}
    </QueryClientProvider>
  );
}
