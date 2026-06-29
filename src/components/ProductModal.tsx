'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowUpRight, Clock, Link2, X } from 'lucide-react';
import type { Product } from './ProductGrid';
import { XIcon } from './ProductGrid';
import styles from './ProductModal.module.css';

interface ProductModalProps {
  product: Product;
  gridRect: DOMRect | null;
  onClose: () => void;
}

const MOBILE_BREAKPOINT = 900;

export function ProductModal({ product, gridRect, onClose }: ProductModalProps) {
  const [mounted, setMounted] = useState(false);
  const [useGridRect, setUseGridRect] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const update = () => setUseGridRect(window.innerWidth > MOBILE_BREAKPOINT);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  if (!mounted) return null;

  const panelStyle =
    useGridRect && gridRect
      ? {
          position: 'fixed' as const,
          top: gridRect.top,
          left: gridRect.left,
          width: gridRect.width,
          height: gridRect.height,
        }
      : undefined;

  const handle = product.handle?.replace(/^@/, '');

  return createPortal(
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={styles.panel}
        style={panelStyle}
        data-accent={product.accent}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={product.name}
      >
        <button className={styles.close} onClick={onClose} aria-label="Close" type="button">
          <X size={18} />
        </button>

        <div
          className={styles.media}
          style={
            product.image
              ? {
                  backgroundImage: `url(${product.image})`,
                  ...(product.imagePosition
                    ? { backgroundPosition: product.imagePosition }
                    : {}),
                }
              : undefined
          }
        >
          {!product.image && product.logo && (
            <img
              className={styles.mediaLogo}
              src={product.logo}
              alt={product.name}
              data-logo-id={product.id}
            />
          )}
        </div>

        <div className={styles.body}>
          <div className={styles.bodyMain}>
            <h2 className={styles.name}>{product.name}</h2>
            <p className={styles.description}>{product.description}</p>
            {product.url && (
              <a
                className={styles.launch}
                href={`https://${product.url}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Launch Site
                <ArrowUpRight size={15} />
              </a>
            )}
          </div>

          <dl className={styles.meta}>
            {product.focus && (
              <div className={styles.metaRow}>
                <dt className={styles.metaLabel}>Focus</dt>
                <dd className={styles.metaValue}>{product.focus}</dd>
              </div>
            )}
            {product.year && (
              <div className={styles.metaRow}>
                <dt className={styles.metaLabel}>Founded</dt>
                <dd className={styles.metaValue}>
                  <Clock size={13} />
                  {product.year}
                </dd>
              </div>
            )}
            {product.url && (
              <div className={styles.metaRow}>
                <dt className={styles.metaLabel}>Website</dt>
                <dd className={styles.metaValue}>
                  <a
                    className={styles.metaLink}
                    href={`https://${product.url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Link2 size={13} />
                    {product.url}
                  </a>
                </dd>
              </div>
            )}
            {handle && (
              <div className={styles.metaRow}>
                <dt className={styles.metaLabel}>X</dt>
                <dd className={styles.metaValue}>
                  <a
                    className={styles.metaLink}
                    href={`https://x.com/${handle}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <XIcon size={13} />
                    {product.handle}
                  </a>
                </dd>
              </div>
            )}
          </dl>
        </div>
      </div>
    </div>,
    document.body,
  );
}
