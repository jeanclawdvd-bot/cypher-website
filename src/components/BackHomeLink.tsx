'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { brandNavParams } from '@/lib/companies/resolve';
import type { CompanyKey } from '@/lib/companies/types';

/**
 * Home link that returns to the current brand's root. Uses the server-set
 * `data-company` on body plus hostname to derive the correct href on dev hosts.
 */
export function BackHomeLink({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  const companyKey = (typeof document !== 'undefined'
    ? document.body.dataset.company
    : null) as CompanyKey | undefined;
  const host = typeof window !== 'undefined' ? window.location.host : null;
  const { homeHref } = brandNavParams(companyKey ?? 'cypher', host);

  return (
    <Link className={className} href={homeHref}>
      {children}
    </Link>
  );
}
