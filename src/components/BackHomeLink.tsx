'use client';

import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import Link from 'next/link';

/**
 * Home link that preserves the active `?company=` dev override so pages like
 * Privacy/Terms return to the current brand's home (e.g. Wilder World) instead
 * of the default company. On real domains there is no param and it stays "/".
 */
export function BackHomeLink({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  const [href, setHref] = useState('/');
  useEffect(() => {
    const company = new URLSearchParams(window.location.search).get('company');
    setHref(company ? `/?company=${company}` : '/');
  }, []);
  return (
    <Link className={className} href={href}>
      {children}
    </Link>
  );
}
