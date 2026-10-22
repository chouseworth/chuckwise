import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { postSchema, type PostData } from './schema';
import { POST_TYPES, postPath, type PostType } from './site';

const IGNORE_DIRS = new Set(['.obsidian', 'templates', 'attachments', 'node_modules']);

export interface IndexedPost {
  id: string;
  plainTitle: string;
  type: PostType;
  published: boolean;
  href: string;
}

export interface ScannedPost {
  absPath: string;
  /** Path relative to the project root, posix. */
  filePath: string;
  id: string;
  body: string;
  raw: string;
  published: boolean;
  kind: 'post' | 'draft' | 'invalid';
  reason?: string;
  data?: PostData;
}

let contentRoot = path.resolve('content');
let cache: ScannedPost[] | null = null;
let indexCache: Map<string, IndexedPost> | null = null;
let attachmentCache: Map<string, string> | null = null;

export function setContentRoot(dir: string) {
  if (path.resolve(dir) !== contentRoot) {
    contentRoot = path.resolve(dir);
    resetContentScan();
  }
}

export function resetContentScan() {
  cache = null;
  indexCache = null;
  attachmentCache = null;
}

function walkMarkdown(dir: string, out: string[]) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (IGNORE_DIRS.has(entry.name)) continue;
      walkMarkdown(full, out);
    } else if (entry.isFile() && (entry.name.endsWith('.md') || entry.name.endsWith('.markdown'))) {
      out.push(full);
    }
  }
}

export function slugify(value: string): string {
  const slug = value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['’]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'post';
}

export function headingSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function plainTitle(title: string): string {
  return title.replace(/\*([^*]+)\*/g, '$1');
}

function isCandidate(data: Record<string, unknown>): boolean {
  if (typeof data.title !== 'string' || !data.title.trim()) return false;
  if (typeof data.type !== 'string' || !POST_TYPES.includes(data.type as PostType)) return false;
  if (data.date == null || data.date === '') return false;
  return true;
}

export function scanPosts(): ScannedPost[] {
  if (cache) return cache;
  const files: string[] = [];
  walkMarkdown(contentRoot, files);
  files.sort((a, b) => a.localeCompare(b));

  const used = new Set<string>();
  const posts: ScannedPost[] = [];
  const projectRoot = path.resolve(contentRoot, '..');

  for (const absPath of files) {
    const raw = fs.readFileSync(absPath, 'utf8');
    let data: Record<string, unknown> = {};
    let body = raw;
    try {
      const parsed = matter(raw);
      data = (parsed.data ?? {}) as Record<string, unknown>;
      body = parsed.content;
    } catch (error) {
      posts.push({
        absPath,
        filePath: toProjectPath(projectRoot, absPath),
        id: uniqueId(slugify(path.basename(absPath, path.extname(absPath))), used),
        body,
        raw,
        published: false,
        kind: 'invalid',
        reason: error instanceof Error ? error.message : 'Could not read frontmatter',
      });
      continue;
    }

    if (!isCandidate(data)) continue;

    const id = uniqueId(slugify(path.basename(absPath, path.extname(absPath))), used);
    const result = postSchema.safeParse(data);
    const filePath = toProjectPath(projectRoot, absPath);
    if (!result.success) {
      const issue = result.error.issues[0];
      const where = issue?.path?.join('.') || 'frontmatter';
      posts.push({
        absPath,
        filePath,
        id,
        body,
        raw,
        published: false,
        kind: 'invalid',
        reason: `${where}: ${issue?.message ?? 'invalid frontmatter'}`,
      });
      continue;
    }

    const draft = result.data.draft === true;
    posts.push({
      absPath,
      filePath,
      id,
      body,
      raw,
      published: !draft,
      kind: draft ? 'draft' : 'post',
      data: result.data,
    });
  }

  cache = posts;
  return posts;
}

function uniqueId(base: string, used: Set<string>): string {
  let id = base || 'post';
  let n = 2;
  while (used.has(id)) id = `${base}-${n++}`;
  used.add(id);
  return id;
}

function toProjectPath(projectRoot: string, absPath: string): string {
  return path.relative(projectRoot, absPath).split(path.sep).join('/');
}

function getIndex(): Map<string, IndexedPost> {
  if (indexCache) return indexCache;
  const map = new Map<string, IndexedPost>();
  for (const post of scanPosts()) {
    if (!post.data) continue;
    const indexed: IndexedPost = {
      id: post.id,
      plainTitle: plainTitle(post.data.title),
      type: post.data.type,
      published: post.published,
      href: postPath(post.data.type, post.id),
    };
    const relative = path.relative(contentRoot, post.absPath);
    const withoutExt = relative.slice(0, relative.length - path.extname(relative).length).split(path.sep).join('/');
    const fileName = path.basename(withoutExt);
    for (const key of [post.id, fileName, withoutExt, post.data.title, indexed.plainTitle, slugify(indexed.plainTitle)]) {
      remember(map, key, indexed);
    }
  }
  indexCache = map;
  return map;
}

function remember(map: Map<string, IndexedPost>, key: string, post: IndexedPost) {
  const normalized = key.trim().toLowerCase();
  if (!normalized) return;
  const existing = map.get(normalized);
  if (!existing || (!existing.published && post.published)) map.set(normalized, post);
}

function resolvePost(target: string): IndexedPost | undefined {
  const index = getIndex();
  const key = target.trim().toLowerCase().replace(/\\/g, '/');
  return index.get(key) ?? index.get(slugify(target));
}

function attachmentMap(): Map<string, string> {
  if (attachmentCache) return attachmentCache;
  const root = path.join(contentRoot, 'attachments');
  const map = new Map<string, string>();
  const walk = (dir: string) => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith('.')) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile()) {
        const rel = path.relative(root, full).split(path.sep).join('/');
        map.set(rel.toLowerCase(), rel);
        map.set(path.basename(rel).toLowerCase(), rel);
      }
    }
  };
  walk(root);
  attachmentCache = map;
  return map;
}

function publicAttachment(name: string): string | undefined {
  const map = attachmentMap();
  const normalized = name.trim().replace(/\\/g, '/').replace(/^\.?\//, '');
  const rel = map.get(normalized.toLowerCase()) ?? map.get(path.posix.basename(normalized).toLowerCase());
  if (!rel) return undefined;
  return `/attachments/${rel.split('/').map(encodeURIComponent).join('/')}`;
}

export function prepareObsidianMarkdown(source: string): string {
  const normalized = source.replace(/\r\n/g, '\n');
  const blocks: string[] = [];
  const protectedSource = normalized.replace(/(```[\s\S]*?```|~~~[\s\S]*?~~~|`[^`\n]+`)/g, (block) => {
    const token = `\u0000CODE${blocks.length}\u0000`;
    blocks.push(block);
    return token;
  });

  const withoutComments = protectedSource.replace(/%%[\s\S]*?%%/g, '');
  const withCallouts = transformCallouts(withoutComments);
  const withLinks = replaceWikilinks(withCallouts);
  const withMarks = withLinks.replace(/==([^=\n]+?)==/g, '<mark>$1</mark>');

  return withMarks.replace(/\u0000CODE(\d+)\u0000/g, (_, index) => blocks[Number(index)] ?? '');
}

function transformCallouts(markdown: string): string {
  const lines = markdown.split('\n');
  const out: string[] = [];
  let i = 0;
  while (i < lines.length) {
    const match = lines[i].match(/^>\s*\[!([A-Za-z-]+)\][+-]?\s*(.*)$/);
    if (!match) {
      out.push(lines[i]);
      i += 1;
      continue;
    }
    const type = match[1].toLowerCase();
    const title = match[2].trim();
    i += 1;
    const body: string[] = [];
    while (i < lines.length && lines[i].startsWith('>')) {
      if (/^>\s*\[!/.test(lines[i])) break;
      body.push(lines[i].replace(/^>\s?/, ''));
      i += 1;
    }
    const label = escapeLabel(title ? `${calloutLabel(type)} — ${title}` : calloutLabel(type));
    out.push(`> [callout:${type}] ${label}`);
    out.push('>');
    for (const line of body) out.push(line.length ? `> ${line}` : '>');
    out.push('');
  }
  return out.join('\n');
}

const CALLOUT_LABELS: Record<string, string> = {
  note: 'Note',
  abstract: 'Abstract',
  summary: 'Summary',
  tldr: 'Summary',
  info: 'Info',
  todo: 'To do',
  tip: 'Tip',
  hint: 'Tip',
  success: 'Note',
  check: 'Note',
  question: 'Question',
  help: 'Question',
  warning: 'Warning',
  caution: 'Warning',
  attention: 'Warning',
  failure: 'Warning',
  fail: 'Warning',
  missing: 'Warning',
  danger: 'Warning',
  error: 'Warning',
  bug: 'Warning',
  example: 'Example',
  quote: 'Quote',
  cite: 'Quote',
};

function calloutLabel(type: string): string {
  return CALLOUT_LABELS[type] ?? type.charAt(0).toUpperCase() + type.slice(1);
}

function escapeLabel(value: string): string {
  return value.replace(/[\\`*_{}[\]()#+\-.!|]/g, '\\$&');
}

function replaceWikilinks(markdown: string): string {
  return markdown.replace(/(^|[^\\])(!?)\[\[([^\]\n]+?)\]\]/g, (full, prefix: string, bang: string, inner: string) => {
    const parsed = parseWikiInner(inner);
    if (bang) return prefix + renderEmbed(parsed);
    return prefix + renderLink(parsed);
  });
}

interface WikiRef {
  target: string;
  alias?: string;
  heading?: string;
}

function parseWikiInner(inner: string): WikiRef {
  let target = inner.trim();
  let alias: string | undefined;
  const pipe = target.indexOf('|');
  if (pipe !== -1) {
    alias = target.slice(pipe + 1).trim();
    target = target.slice(0, pipe).trim();
  }
  let heading: string | undefined;
  const hash = target.indexOf('#');
  if (hash !== -1) {
    heading = target.slice(hash + 1).trim();
    target = target.slice(0, hash).trim();
  }
  return { target, alias: alias || undefined, heading: heading || undefined };
}

function renderLink(ref: WikiRef): string {
  const post = resolvePost(ref.target);
  const text = ref.alias || (post?.published ? post.plainTitle : ref.target);
  if (!post?.published) return escapePlain(text);
  const hash = ref.heading ? `#${headingSlug(ref.heading)}` : '';
  return `[${escapeLinkText(text)}](${post.href}${hash})`;
}

function renderEmbed(ref: WikiRef): string {
  const src = publicAttachment(ref.target);
  const alt = ref.alias && !/^\d+$/.test(ref.alias) ? ref.alias : path.posix.basename(ref.target);
  if (!src) return escapePlain(alt);
  const width = ref.alias && /^\d+$/.test(ref.alias) ? ref.alias : undefined;
  const safeAlt = escapeHtml(alt);
  const widthAttr = width ? ` width="${width}"` : '';
  const caption = ref.alias && !width ? `<figcaption>${safeAlt}</figcaption>` : '';
  return `\n\n<figure class="figure"><img src="${escapeHtml(src)}" alt="${safeAlt}"${widthAttr} />${caption}</figure>\n\n`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeLinkText(value: string): string {
  return value.replace(/([\\\[\]])/g, '\\$1');
}

function escapePlain(value: string): string {
  return value.replace(/[\\`*_{}[\]()#+\-.!|]/g, '\\$&');
}
