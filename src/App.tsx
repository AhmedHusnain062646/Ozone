// ABOUTME: Application root: TanStack Query + toasts + router. All server state lives in the query cache.
// ABOUTME: Queries do not retry 4xx (they are deterministic) and refetch on window focus for fresh stock.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router/dom';
import { ApiError } from './lib/api.ts';
import { router } from './router.tsx';
import { ToastProvider } from './components/ui/index.ts';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      retry: (count, err) => !(err instanceof ApiError && err.status >= 400 && err.status < 500) && count < 2,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>
    </QueryClientProvider>
  );
}
