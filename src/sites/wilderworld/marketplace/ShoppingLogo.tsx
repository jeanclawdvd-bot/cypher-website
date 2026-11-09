'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import logoStyles from '@/components/Nav.module.css';
import styles from './Marketplace.module.css';

export default function ShoppingLogo() {
  const router = useRouter();
  const [burst, setBurst] = useState(0);
  const [playing, setPlaying] = useState(false);
  const navigation = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (navigation.current) clearTimeout(navigation.current); }, []);

  return <Link data-page-transition="none" href="/" prefetch={true} className={`${styles.wordmark} ${logoStyles.titleLink}`} aria-label="Wilder World home" onClick={event => {
    // Warm the home route and give the click a quick burst before navigation.
    // Modified clicks retain the link's normal new-tab behavior.
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    setBurst(value => value + 1);
    setPlaying(true);
    // Repeated clicks can replay the effect without postponing navigation.
    if (navigation.current) return;
    navigation.current = setTimeout(() => {
      navigation.current = null;
      router.push('/');
    }, 140);
  }}><img key={burst} className={`${logoStyles.brandLogo} ${playing ? logoStyles.brandLogoGlitch : ''}`} style={playing ? {animationDuration:'180ms'} : undefined} src="/images/wilder-world/wilder-world-logo-orange.svg" alt="" onAnimationEnd={() => setPlaying(false)}/></Link>;
}
