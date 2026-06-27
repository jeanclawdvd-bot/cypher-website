import Link from 'next/link';
import { ArrowUpRight, Clock, Link2 } from 'lucide-react';
import styles from './page.module.css';

function XIcon({ size = 12 }: { size?: number }) {
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

interface Product {
  id: string;
  name: string;
  tagline: string;
  href: string;
  external?: boolean;
  accent: 'cyan' | 'blue' | 'purple' | 'green' | 'orange' | 'rose';
  /** bento placement class applied to the card */
  span?: string;
  /** optional background image src, revealed on hover */
  image?: string;
  /** optional CSS background-position for the image (defaults to center) */
  imagePosition?: string;
  /** optional centered company logo shown when the card is idle */
  logo?: string;
  /** website shown in the hover meta row, e.g. "zero.tech" */
  url?: string;
  /** founding year shown in the hover meta row, e.g. "2017" */
  year?: string;
  /** X (Twitter) handle shown in the hover meta row, e.g. "@zero_app" */
  handle?: string;
}

const products: Product[] = [
  {
    id: 'aura',
    name: 'AURA',
    tagline: 'Autonomous engineering agents.',
    href: 'https://aura.ai',
    external: true,
    accent: 'cyan',
    span: 'tall',
    image: '/images/aura/aura-bg.png',
    logo: '/images/aura/aura-logo.png',
    url: 'aura.ai',
    year: '2024',
    handle: '@aura_asi',
  },
  {
    id: 'zero',
    name: 'ZERO',
    tagline: 'A secure OS for an agentic world.',
    href: '/zero',
    accent: 'blue',
    logo: '/images/zero/zero-logo.svg',
    url: 'zero.tech',
    year: '2017',
    handle: '@zero_app',
  },
  {
    id: 'zns',
    name: 'ZNS',
    tagline: 'Naming for the network.',
    href: '#',
    accent: 'cyan',
  },
  {
    id: 'z-chain',
    name: 'Z Chain',
    tagline: 'Trust layer for autonomous systems.',
    href: 'https://zchain.org',
    external: true,
    accent: 'green',
    logo: '/images/z-chain/z-chain-logo.svg',
    url: 'zchain.org',
    year: '2023',
    handle: '@zchain_org',
  },
  {
    id: 'zode',
    name: 'ZODE',
    tagline: 'Agentic coding, end to end.',
    href: '/zode',
    accent: 'orange',
    span: 'wide',
    image: '/images/zode/zode-bg.png',
    logo: '/images/zode/zode-logo.png',
    url: 'thegrid.host',
    year: '2026',
    handle: '@zode_org',
  },
  {
    id: 'the-grid',
    name: 'THE GRID',
    tagline: 'Distributed compute fabric.',
    href: 'https://github.com/cypher-asi/the-grid',
    external: true,
    accent: 'rose',
    span: 'tall',
    logo: '/images/the-grid/the-grid-logo.png',
  },
  {
    id: 'wilder-world',
    name: 'Wilder World',
    tagline: 'An immersive on-chain metaverse.',
    href: '#',
    accent: 'purple',
    span: 'wide3',
    image: '/images/wilder-world/wilder-world-bg.png',
    imagePosition: 'center',
    logo: '/images/wilder-world/wilder-world-logo.svg',
    url: 'wilderworld.com',
    year: '2021',
    handle: '@wilderworld',
  },
];

function CardInner({ product, index }: { product: Product; index: number }) {
  return (
    <>
      {product.image && (
        <span
          className={styles.cardImage}
          style={{
            backgroundImage: `url(${product.image})`,
            ...(product.imagePosition ? { backgroundPosition: product.imagePosition } : {}),
          }}
          aria-hidden
        />
      )}
      {product.logo ? (
        <img
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
      <span className={styles.cardArrow}>
        <ArrowUpRight size={16} />
      </span>
      <span className={styles.cardMeta}>0{index + 1}</span>
      <span className={styles.cardBody}>
        <span className={styles.cardName}>{product.name}</span>
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
    </>
  );
}

export default function Home() {
  return (
    <div className={styles.page}>
      <div className={styles.grid}>
        {products.map((product, index) => {
          const className = `${styles.card} ${product.span ? styles[product.span] : ''}`;
          const style = { animationDelay: `${120 + index * 70}ms` } as const;

          return product.external ? (
            <a
              key={product.id}
              href={product.href}
              target="_blank"
              rel="noopener noreferrer"
              className={className}
              data-accent={product.accent}
              style={style}
            >
              <CardInner product={product} index={index} />
            </a>
          ) : (
            <Link
              key={product.id}
              href={product.href}
              className={className}
              data-accent={product.accent}
              style={style}
            >
              <CardInner product={product} index={index} />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
