'use client';

import { useEffect, useState } from 'react';
import type { NewsItem } from '@/app/api/news/route';
import { FadeInImage } from '@/components/FadeInImage';
import styles from './Landing.module.css';

function isNewsItem(value: unknown): value is NewsItem {
  if (typeof value !== 'object' || value === null) return false;
  return 'title' in value && typeof value.title === 'string'
    && 'url' in value && typeof value.url === 'string'
    && 'image' in value && (value.image === null || typeof value.image === 'string')
    && 'date' in value && (value.date === null || typeof value.date === 'string');
}

function formatDate(date: string | null): string | null {
  if (!date) return null;
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function NewsCarousel() {
  const [items, setItems] = useState<NewsItem[]>([]);

  useEffect(() => {
    let active = true;
    fetch('/api/news')
      .then((res) => res.json())
      .then((data: unknown) => {
        if (active && typeof data === 'object' && data !== null
          && 'items' in data && Array.isArray(data.items)) {
          setItems(data.items.filter(isNewsItem));
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  if (items.length === 0) return null;

  return (
    <div className={styles.newsRow}>
      {items.map((item) => (
        <a
          key={item.url}
          className={styles.newsCard}
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
        >
          {item.image ? (
            <FadeInImage
              className={styles.newsImage}
              src={item.image}
              alt=""
              aria-hidden
              loading="lazy"
            />
          ) : null}
          <div className={styles.newsBody}>
            <h3 className={styles.newsTitle}>{item.title}</h3>
            {formatDate(item.date) ? (
              <span className={styles.newsDate}>{formatDate(item.date)}</span>
            ) : null}
          </div>
        </a>
      ))}
    </div>
  );
}
