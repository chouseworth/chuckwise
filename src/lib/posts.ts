import { getCollection, type CollectionEntry } from 'astro:content';
import { postPath, sectionForType, site, type PostType, typeKicker } from './site';

export interface PostData {
  title: string;
  type: PostType;
  date: Date;
  dek?: string;
  tags?: string[];
  draft?: boolean;
  comments: boolean;
  author?: string;
  author_bio?: string;
  rating?: number;
}

export interface PostEntry {
  id: string;
  body?: string;
  data: PostData;
  entry: CollectionEntry<'posts'>;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function plainTitle(title: string): string {
  return title.replace(/\*([^*]+)\*/g, '$1');
}

export function titleHtml(title: string): string {
  return escapeHtml(title).replace(/\*([^*]+)\*/g, '<em>$1</em>');
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

export function formatShortDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

export function isoDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function readingMinutes(body: string | undefined): number {
  if (!body) return 1;
  const words = body
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[#>*_`\[\]()]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.round(words / 230));
}

export function openingParagraphs(body: string | undefined, count = 2): string[] {
  if (!body) return [];
  const paragraphs: string[] = [];
  for (const block of body.split(/\n\s*\n/)) {
    const trimmed = block.trim();
    if (!trimmed) continue;
    if (/^(#{1,6}\s|>|!\s|!\[|```|\||[-*+]\s|\d+\.\s)/.test(trimmed)) continue;
    const text = trimmed
      .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
      .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2')
      .replace(/\[\[([^\]]+)\]\]/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
      .replace(/[*_`]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (!text) continue;
    paragraphs.push(text);
    if (paragraphs.length >= count) break;
  }
  return paragraphs;
}

export function safeUrl(value: string | undefined): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    if (url.protocol === 'http:' || url.protocol === 'https:') return url.href;
  } catch {
    return undefined;
  }
  return undefined;
}

export function tagSlug(tag: string): string {
  return tag
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function starString(rating: number): string {
  const full = Math.max(0, Math.min(5, Math.round(rating)));
  return `${'★'.repeat(full)}${'☆'.repeat(5 - full)}`;
}

export function hrefFor(post: PostEntry): string {
  return postPath(post.data.type, post.id);
}

export function kickerFor(post: PostEntry): string {
  return typeKicker[post.data.type];
}

export async function getPublished(): Promise<PostEntry[]> {
  const all = await getCollection('posts');
  const posts: PostEntry[] = [];
  for (const entry of all) {
    const normalized = normalize(entry);
    if (normalized) posts.push(normalized);
  }
  posts.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
  return posts;
}

function normalize(entry: CollectionEntry<'posts'>): PostEntry | null {
  const data = entry.data as Partial<PostData> | undefined;
  if (!data || typeof data.title !== 'string' || !data.type) return null;
  if (data.draft === true) return null;
  const date = data.date instanceof Date ? data.date : new Date(String(data.date));
  if (Number.isNaN(date.getTime())) return null;
  return {
    id: entry.id,
    body: entry.body,
    entry,
    data: {
      title: data.title,
      type: data.type,
      date,
      dek: clean(data.dek),
      tags: Array.isArray(data.tags) ? data.tags : undefined,
      draft: false,
      comments: data.comments !== false,
      author: clean(data.author),
      author_bio: clean(data.author_bio),
      rating: typeof data.rating === 'number' ? data.rating : undefined,
    },
  };
}

export function displayAuthor(post: PostEntry): string {
  return post.data.author?.trim() || site.author;
}

export function isGuest(post: PostEntry): boolean {
  return displayAuthor(post).toLowerCase() !== site.author.toLowerCase();
}

export function latestOfType(posts: PostEntry[], type: PostType, limit: number): PostEntry[] {
  return posts.filter((post) => post.data.type === type).slice(0, limit);
}

function clean(value: string | null | undefined): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

export function sectionLabel(type: PostType): string {
  return sectionForType(type).label;
}
