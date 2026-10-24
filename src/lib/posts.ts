import { getCollection, type CollectionEntry } from 'astro:content';
import { PAGE_SIZE, postPath, sectionForType, site, type PostType, typeKicker } from './site';

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
  /** Rendered HTML for a shortened essay. Absent when the post is shown in full. */
  excerptHtml?: string;
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
    excerptHtml: readExcerpt(entry),
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

export function pageCount(total: number, size = PAGE_SIZE): number {
  return Math.max(1, Math.ceil(total / size));
}

export interface PageSlice<T> {
  items: T[];
  page: number;
  pages: number;
  newerHref?: string;
  olderHref?: string;
}

export function slicePage<T>(
  items: T[],
  page: number,
  hrefForPage: (page: number) => string,
  size = PAGE_SIZE,
): PageSlice<T> {
  const pages = pageCount(items.length, size);
  const start = (page - 1) * size;
  return {
    items: items.slice(start, start + size),
    page,
    pages,
    newerHref: page > 1 ? hrefForPage(page - 1) : undefined,
    olderHref: page < pages ? hrefForPage(page + 1) : undefined,
  };
}

export function homePagePath(page: number): string {
  return page <= 1 ? '/' : `/page/${page}/`;
}

export function sectionPagePath(slug: string, page: number): string {
  return page <= 1 ? `/${slug}/` : `/${slug}/page/${page}/`;
}

export function tagPagePath(slug: string, page: number): string {
  return page <= 1 ? `/tags/${slug}/` : `/tags/${slug}/page/${page}/`;
}

export function postsForTag(posts: PostEntry[], slug: string): PostEntry[] {
  return posts.filter((post) => (post.data.tags ?? []).some((tag) => tagSlug(tag) === slug));
}

export function collectTags(posts: PostEntry[]): Map<string, { label: string; count: number }> {
  const tags = new Map<string, { label: string; count: number }>();
  for (const post of posts) {
    for (const tag of post.data.tags ?? []) {
      const slug = tagSlug(tag);
      if (!slug) continue;
      const existing = tags.get(slug);
      if (existing) existing.count += 1;
      else tags.set(slug, { label: tag, count: 1 });
    }
  }
  return tags;
}

function readExcerpt(entry: CollectionEntry<'posts'>): string | undefined {
  const metadata = entry.rendered?.metadata;
  if (!metadata) return undefined;
  const html = metadata.excerptHtml;
  return typeof html === 'string' && html.trim() ? html : undefined;
}

function clean(value: string | null | undefined): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

export function sectionLabel(type: PostType): string {
  return sectionForType(type).label;
}
