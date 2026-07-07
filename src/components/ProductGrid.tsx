'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { ArrowUpRight, Clock, Link2 } from 'lucide-react';
import { ProductModal } from './ProductModal';
import { FadeInImage } from '@/components/FadeInImage';
import styles from '@/sites/cypher/Landing.module.css';

export function XIcon({ size = 12 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.66l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

export interface Product {
  id: string;
  name: string;
  tagline: string;
  accent: 'cyan' | 'blue' | 'purple' | 'green' | 'orange' | 'rose';
  /** bento placement class applied to the card */
  span?: string;
  /** optional background image src, revealed on hover */
  image?: string;
  /** optional image that cross-fades in on hover, replacing `image` */
  hoverImage?: string;
  /** optional CSS background-position for the image (defaults to center) */
  imagePosition?: string;
  /** optional CSS background-position used only on mobile (defaults to imagePosition) */
  imagePositionMobile?: string;
  /** optional centered company logo shown when the card is idle */
  logo?: string;
  /** website shown in the hover meta row, e.g. "zero.tech" */
  url?: string;
  /** founding year shown in the hover meta row, e.g. "2017" */
  year?: string;
  /** X (Twitter) handle shown in the hover meta row, e.g. "@zero_app" */
  handle?: string;
  /** one-line focus shown in the modal */
  focus?: string;
  /** longer blurb shown in the modal */
  description: string;
  /** when set, the card navigates here instead of opening the modal */
  siteHref?: string;
}

const products: Product[] = [
  {
    id: 'aura',
    name: 'AURA',
    tagline: 'An agentic coding system.',
    accent: 'cyan',
    span: 'tall',
    image: '/images/aura/aura-bg.png',
    imagePositionMobile: 'center 22%',
    logo: '/images/aura/aura-logo.png',
    url: 'aura.ai',
    year: '2024',
    handle: '@aura_asi',
    focus: 'Agentic coding system',
    description:
      'AURA is an agentic coding system that plans, writes, tests, and ships software end to end, operating as a sovereign engineering workforce that compounds with every task.',
  },
  {
    id: 'zero',
    name: 'ZERO',
    tagline: 'A secure messenger.',
    accent: 'blue',
    image: '/images/zero/zero-bg.png',
    imagePositionMobile: 'center 35%',
    logo: '/images/zero/zero-logo.svg',
    url: 'zero.tech',
    year: '2017',
    handle: '@zero_app',
    focus: 'Secure messenger',
    description:
      'ZERO is a secure, private messenger for an agentic world, pairing end-to-end encrypted communication with the identity and infrastructure people need to own their data.',
    siteHref: 'https://zero.tech',
  },
  {
    id: 'zns',
    name: 'ZNS',
    tagline: 'A sovereign identity system.',
    accent: 'cyan',
    image: '/images/zns/zns-bg.png',
    logo: '/images/zns/zns-logo.png',
    focus: 'Sovereign identity system',
    description:
      'ZNS is a sovereign identity system that maps human-readable names to the people, agents, and services on the network—portable identity that you own and fully control.',
  },
  {
    id: 'z-chain',
    name: 'Z Chain',
    tagline: 'A blazing-fast blockchain.',
    accent: 'green',
    image: '/images/z-chain/z-chain-bg.png',
    logo: '/images/z-chain/z-chain-logo.svg',
    url: 'zchain.org',
    year: '2023',
    handle: '@zchain_org',
    focus: 'Blazing-fast blockchain',
    description:
      'Z Chain is a blazing-fast blockchain built for autonomous systems, delivering verifiable, high-throughput settlement so agents can transact and coordinate without a central authority.',
  },
  {
    id: 'zode',
    name: 'ZODE',
    tagline: 'A micro-data center.',
    accent: 'orange',
    span: 'wide',
    image: '/images/zode/zode-bg.png',
    logo: '/images/zode/zode-logo.png',
    url: 'zode.org',
    year: '2026',
    handle: '@zode_org',
    focus: 'Micro-data center',
    description:
      'ZODE is a micro-data center for AI—compact, energy-aware compute infrastructure that brings sovereign training and inference closer to where it is needed.',
  },
  {
    id: 'the-grid',
    name: 'THE GRID',
    tagline: 'A distributed compute network.',
    accent: 'rose',
    span: 'tall',
    image: '/images/the-grid/the-grid-bg.png',
    imagePositionMobile: 'center center',
    logo: '/images/the-grid/the-grid-logo.png',
    focus: 'Distributed compute network',
    description:
      'THE GRID is a distributed compute network that pools resources across the world, giving sovereign agents and applications the power they need on demand.',
  },
  {
    id: 'wilder-world',
    name: 'Wilder World',
    tagline: 'A virtual simulation.',
    accent: 'purple',
    span: 'wide3',
    image: '/images/wilder-world/wilder-world-bg.png',
    imagePosition: 'center',
    imagePositionMobile: 'center center',
    logo: '/images/wilder-world/wilder-world-logo.svg',
    url: 'wilderworld.com',
    year: '2021',
    handle: '@wilderworld',
    focus: 'Virtual simulation',
    description:
      'Wilder World is an AI-powered virtual simulation—a photorealistic, living world owned by its community and built on open, decentralized rails.',
    siteHref: 'https://wilderworld.com',
  },
];

function imageStyle(product: Product, src: string): CSSProperties {
  const desktop = product.imagePosition ?? 'center';
  const mobile = product.imagePositionMobile ?? desktop;
  return {
    backgroundImage: `url(${src})`,
    '--img-pos': desktop,
    '--img-pos-mobile': mobile,
  } as CSSProperties;
}

/** ms between each typed character of a card's name */
const TYPE_SPEED = 55;

/**
 * Reveals `text` one character at a time once `active` flips true. Returns the
 * visible substring plus whether it is still typing (for the caret). Text
 * reveal is non-vestibular, so it intentionally runs under reduced motion too,
 * matching the card image fade.
 */
function useTypewriter(text: string, active: boolean) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!active) {
      setCount(0);
      return;
    }
    setCount(0);
    let typed = 0;
    const id = setInterval(() => {
      typed += 1;
      setCount(typed);
      if (typed >= text.length) clearInterval(id);
    }, TYPE_SPEED);
    return () => clearInterval(id);
  }, [active, text]);

  return { typed: text.slice(0, count), typing: active && count < text.length };
}

function CardInner({
  product,
  index,
  shown,
}: {
  product: Product;
  index: number;
  shown: boolean;
}) {
  const { typed, typing } = useTypewriter(product.name, shown);

  return (
    <>
      {product.image && (
        <span
          className={styles.cardImage}
          style={imageStyle(product, product.image)}
          aria-hidden
        />
      )}
      {product.hoverImage && (
        <span
          className={styles.cardImageHover}
          style={imageStyle(product, product.hoverImage)}
          aria-hidden
        />
      )}
      <span className={styles.cardArrow}>
        <ArrowUpRight size={16} />
      </span>
      <span className={styles.cardMeta}>0{index + 1}</span>
      <span className={styles.cardFooter}>
        <span className={styles.cardBody}>
          <span className={styles.cardLogoSection}>
            {product.logo ? (
              <FadeInImage
                className={styles.cardLogo}
                src={product.logo}
                alt={product.name}
                data-logo-id={product.id}
                aria-hidden
              />
            ) : (
              <span className={styles.cardLogoPlaceholder} aria-hidden>
                {product.name}
              </span>
            )}
          </span>
          <span className={styles.cardName} aria-hidden>
            {typed}
            <span className={styles.caret} data-typing={typing ? '' : undefined} />
          </span>
          <span className={styles.srOnly}>{product.name}</span>
          <span className={styles.cardTagline}>{product.tagline}</span>
          {(product.url || product.year || product.handle) && (
            <span className={styles.cardStats}>
              {product.url && (
                <span className={styles.cardStat}>
                  <Link2 size={12} />
                  {product.url}
                </span>
              )}
              {product.year && (
                <span className={styles.cardStat}>
                  <Clock size={12} />
                  {product.year}
                </span>
              )}
              {product.handle && (
                <span className={styles.cardStat}>
                  <XIcon size={12} />
                  {product.handle}
                </span>
              )}
            </span>
          )}
        </span>
      </span>
    </>
  );
}

/** ms between revealing one card's image and starting the next */
const REVEAL_CADENCE = 80;

export function ProductGrid() {
  const gridRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<Product | null>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [loaded, setLoaded] = useState<boolean[]>(() =>
    products.map(() => false),
  );
  const [revealCount, setRevealCount] = useState(0);

  // Preload each card's background image so the fade triggers off the real
  // load (no popping), warming the cache so the painted background appears
  // instantly once revealed. Errored/cached images resolve too so the
  // sequence never stalls. The reveal is an opacity-only cross-fade (no
  // movement), so it runs under reduced motion too; only the hover-lift
  // transform is suppressed there.
  useEffect(() => {
    const markLoaded = (index: number) =>
      setLoaded((prev) => {
        if (prev[index]) return prev;
        const next = [...prev];
        next[index] = true;
        return next;
      });

    products.forEach((product, index) => {
      if (!product.image) {
        markLoaded(index);
        return;
      }
      const img = new Image();
      img.onload = () => markLoaded(index);
      img.onerror = () => markLoaded(index);
      img.src = product.image;
      if (img.complete) markLoaded(index);
    });
  }, []);

  // Walk a reveal cursor through the cards in order: advance past card N only
  // once its image has loaded, pacing each step by REVEAL_CADENCE.
  useEffect(() => {
    if (revealCount >= products.length) return;
    if (!loaded[revealCount]) return;
    const timer = setTimeout(
      () => setRevealCount((c) => c + 1),
      REVEAL_CADENCE,
    );
    return () => clearTimeout(timer);
  }, [loaded, revealCount]);

  const open = (product: Product) => {
    if (gridRef.current) {
      const r = gridRef.current.getBoundingClientRect();
      // Normalize to the grid's position as if the page were scrolled to the
      // top. The modal panel is position: fixed, so using the live (scrolled)
      // rect would shift it off-screen; this keeps it anchored to the grid's
      // first-screen location no matter how far the page is scrolled.
      setRect(new DOMRect(r.left + window.scrollX, r.top + window.scrollY, r.width, r.height));
    }
    setActive(product);
  };

  return (
    <>
      <div className={styles.grid} ref={gridRef}>
        {products.map((product, index) => {
          const className = `${styles.card} ${product.span ? styles[product.span] : ''}`;
          const shown = index < revealCount;

          if (product.siteHref) {
            // Full navigation (not a Next <Link>) so the server re-resolves the
            // company and the layout/header chrome updates for the target site.
            return (
              <a
                key={product.id}
                href={product.siteHref}
                className={className}
                data-accent={product.accent}
                data-shown={shown ? '' : undefined}
              >
                <CardInner product={product} index={index} shown={shown} />
              </a>
            );
          }

          return (
            <button
              key={product.id}
              type="button"
              className={className}
              data-accent={product.accent}
              data-shown={shown ? '' : undefined}
              onClick={() => open(product)}
            >
              <CardInner product={product} index={index} shown={shown} />
            </button>
          );
        })}
      </div>
      {active && (
        <ProductModal product={active} gridRect={rect} onClose={() => setActive(null)} />
      )}
    </>
  );
}
