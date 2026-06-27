import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import styles from './page.module.css';

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
    logo: '/images/aura/aura-logo.svg',
  },
  {
    id: 'zero',
    name: 'ZERO',
    tagline: 'A secure OS for an agentic world.',
    href: '/zero',
    accent: 'blue',
    logo: '/images/zero/zero-logo.svg',
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
    logo: '/images/z-chain/z-chain-logo.png',
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
      <span className={styles.cardGrid} aria-hidden />
      {product.logo ? (
        <img className={styles.cardLogo} src={product.logo} alt={product.name} aria-hidden />
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
