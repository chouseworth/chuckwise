import { getCollection, type CollectionEntry } from 'astro:content';
import { postPath, sectionForType, site, type PostType, typeKicker } from './site';

export interface PostData {
  title: string;
  type: PostType;
  date: Date;
  dek?: string;
  tags?: string[];
  featured?: boolean;
  lead?: boolean;
  draft?: boolean;
  sourceUrl?: string;
  sourceTitle?: string;
  rating?: number;
  pullQuote?: string;
  coverLine?: string;
  guest?: string;
}

export interface PostEntry {
  id: string;
  body?: string;
  data: PostData;
  entry: CollectionEntry<'posts'>;
}

export type CardVariant = 'essay' | 'quote' | 'review' | 'conversation' | 'note' | 'plain';

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
      featured: data.featured === true,
      lead: data.lead === true,
      draft: false,
      sourceUrl: clean(data.sourceUrl),
      sourceTitle: clean(data.sourceTitle),
      rating: typeof data.rating === 'number' ? data.rating : undefined,
      pullQuote: clean(data.pullQuote),
      coverLine: clean(data.coverLine),
      guest: clean(data.guest),
    },
  };
}

function clean(value: string | null | undefined): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

export function pickLead(posts: PostEntry[]): PostEntry | undefined {
  return (
    posts.find((post) => post.data.lead) ??
    posts.find((post) => post.data.type === 'essay') ??
    posts[0]
  );
}

export function featuredPosts(posts: PostEntry[], leadId?: string): PostEntry[] {
  const flagged = posts.filter((post) => post.data.featured && post.id !== leadId);
  if (flagged.length > 0) return flagged;
  return posts.filter((post) => post.id !== leadId).slice(0, 4);
}

/** Which featured post is "this week", stable for seven days. */
export function rotationIndex(count: number, now = new Date()): number {
  if (count <= 1) return 0;
  const [year, month, day] = site.rotationEpoch.split('-').map(Number);
  const epoch = Date.UTC(year, month - 1, day);
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const weeks = Math.floor((today - epoch) / 604_800_000);
  return ((weeks % count) + count) % count;
}

export interface GridSlot {
  post: PostEntry;
  span: string;
  variant: CardVariant;
}

const GRID_PLAN: Array<{ span: string; variant: CardVariant; type?: PostType }> = [
  { span: 'c1', variant: 'essay', type: 'essay' },
  { span: 'c2', variant: 'quote', type: 'short-take' },
  { span: 'c3', variant: 'review', type: 'review' },
  { span: 'c4', variant: 'conversation', type: 'conversation' },
  { span: 'c5', variant: 'note', type: 'note' },
  { span: 'c6', variant: 'plain', type: 'short-take' },
  { span: 'c7', variant: 'essay', type: 'essay' },
];

export function composeLatest(posts: PostEntry[], leadId?: string): GridSlot[] {
  const pool = posts.filter((post) => post.id !== leadId);
  const used = new Set<string>();
  const take = (type?: PostType) => {
    const found = pool.find((post) => !used.has(post.id) && (!type || post.data.type === type));
    if (!found) return undefined;
    used.add(found.id);
    return found;
  };

  const slots: GridSlot[] = [];
  for (const plan of GRID_PLAN) {
    const preferred = take(plan.type);
    const post = preferred ?? take();
    if (!post) break;
    const variant = preferred ? plan.variant : variantFor(post);
    slots.push({ post, span: plan.span, variant });
  }

  const extras = ['c3', 'c4', 'c5'];
  for (const post of pool) {
    if (used.has(post.id)) continue;
    slots.push({
      post,
      span: extras[slots.length % extras.length],
      variant: variantFor(post),
    });
  }
  return slots;
}

function variantFor(post: PostEntry): CardVariant {
  switch (post.data.type) {
    case 'short-take':
      return 'quote';
    case 'review':
      return 'review';
    case 'conversation':
      return 'conversation';
    case 'note':
      return 'note';
    default:
      return 'essay';
  }
}

export function sectionLabel(type: PostType): string {
  return sectionForType(type).label;
}
