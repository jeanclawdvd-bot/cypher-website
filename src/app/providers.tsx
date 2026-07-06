'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { CompanyKey } from '@/lib/companies/types';
import { pageview, setAnalyticsProvider } from '@/features/analytics';
import { createMixpanelProvider } from '@/features/analytics/mixpanel';

function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Route handlers already cache upstream data (revalidate = 300), so a
        // generous client stale time avoids redundant refetches on navigation.
        staleTime: 60_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  });
}

export function Providers({
  children,
  company,
}: {
  children: ReactNode;
  company: CompanyKey;
}) {
  // One client per browser session; kept in state so it survives re-renders
  // without being recreated (which would drop the cache).
  const [queryClient] = useState(createQueryClient);
  const pathname = usePathname();

  // Point the analytics boundary at Mixpanel for the active site. No-op if the
  // site has no token. Company is fixed per domain, so this runs once.
  useEffect(() => {
    const provider = createMixpanelProvider(company);
    if (provider) setAnalyticsProvider(provider);
  }, [company]);

  // Fire a pageview on first load and on each client-side navigation.
  useEffect(() => {
    if (pathname) pageview(pathname, company);
  }, [pathname, company]);

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
