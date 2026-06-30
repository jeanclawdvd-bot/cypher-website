'use client';

import { useEffect, useState } from 'react';
import type { NewsItem } from '@/app/api/news/route';
import styles from './Landing.module.css';

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
      .then((data: { items?: NewsItem[] }) => {
        if (active && Array.isArray(data.items)) setItems(data.items);
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
            <img
              className={styles.newsImage}
              src={item.image}
              alt=""
              aria-hidden
              loading="lazy"
            />
          ) : null}
          <span className={styles.newsChip}>News</span>
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
