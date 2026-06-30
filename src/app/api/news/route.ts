import { NextResponse } from 'next/server';

const FEED_URL = 'https://www.zine.live/rss/';
const MAX_ITEMS = 8;

export type NewsItem = {
  title: string;
  url: string;
  image: string | null;
  date: string | null;
};

function decodeEntities(input: string): string {
  return input
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
}

function pick(block: string, tag: string): string | null {
  const match = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i'));
  return match ? decodeEntities(match[1]) : null;
}

function parseFeed(xml: string): NewsItem[] {
  const items: NewsItem[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match: RegExpExecArray | null;

  while ((match = itemRegex.exec(xml)) && items.length < MAX_ITEMS) {
    const block = match[1];
    const title = pick(block, 'title');
    const url = pick(block, 'link');
    if (!title || !url) continue;

    const mediaMatch = block.match(/<media:content[^>]*url="([^"]+)"/i);
    const imgMatch = block.match(/<img[^>]*src="([^"]+)"/i);
    const image = mediaMatch?.[1] ?? imgMatch?.[1] ?? null;

    items.push({
      title,
      url,
      image,
      date: pick(block, 'pubDate'),
    });
  }

  return items;
}

export const revalidate = 3600;

export async function GET() {
  try {
    const res = await fetch(FEED_URL, { next: { revalidate } });
    if (!res.ok) throw new Error(`Feed responded ${res.status}`);
    const xml = await res.text();
    return NextResponse.json({ items: parseFeed(xml) });
  } catch {
    return NextResponse.json({ items: [] });
  }
}
