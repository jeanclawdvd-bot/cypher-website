'use client';

import { useState, useCallback } from 'react';
import styles from './FAQ.module.css';

export interface FAQItem {
  question: string;
  answer: string;
}

interface FAQProps {
  title?: string;
  items: FAQItem[];
}

export function FAQ({ title = 'Questions & answers', items }: FAQProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggle = useCallback((index: number) => {
    setOpenIndex((prev) => (prev === index ? null : index));
  }, []);

  return (
    <div className={styles.faq}>
      {title && <h2 className={styles.title}>{title}</h2>}
      <div className={styles.list} role="list">
        {items.map((item, i) => {
          const isOpen = openIndex === i;
          return (
            <div key={i} className={styles.item} role="listitem">
              <button
                className={styles.trigger}
                onClick={() => toggle(i)}
                aria-expanded={isOpen}
              >
                <span className={styles.question}>{item.question}</span>
                <span
                  className={`${styles.icon} ${isOpen ? styles.iconOpen : ''}`}
                  aria-hidden="true"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  >
                    <line x1="8" y1="3" x2="8" y2="13" />
                    <line x1="3" y1="8" x2="13" y2="8" />
                  </svg>
                </span>
              </button>
              <div
                className={`${styles.panel} ${isOpen ? styles.panelOpen : ''}`}
                role="region"
              >
                <div className={styles.panelInner}>
                  <p className={styles.answer}>{item.answer}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
