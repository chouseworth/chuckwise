import { z } from 'astro/zod';
import { POST_TYPES } from './site';

const emptyToUndefined = (value: unknown) => {
  if (value == null) return undefined;
  if (typeof value === 'string' && value.trim() === '') return undefined;
  return value;
};

const optionalString = z.preprocess(emptyToUndefined, z.string().optional());

/** A cover path, a bare filename, or a wikilink. Odd shapes are dropped. */
const optionalImage = z.preprocess((value) => {
  if (value == null || value === '') return undefined;
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    const parts = value.flat(Infinity).filter((part) => typeof part === 'string' && part.trim());
    if (parts.length >= 1) return parts[0];
  }
  return undefined;
}, z.string().optional());

const optionalBool = z.preprocess((value) => {
  if (value == null || value === '') return undefined;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', 'yes'].includes(normalized)) return true;
    if (['false', 'no'].includes(normalized)) return false;
  }
  return value;
}, z.boolean().optional());

/**
 * Unknown frontmatter keys are stripped. A weird value on an optional field
 * is dropped instead of failing the file. Required fields still have to parse;
 * the loader skips a file that does not, so one bad note cannot fail the build.
 */
export const postSchema = z.object({
  title: z.preprocess((value) => (typeof value === 'number' ? String(value) : value), z.string().min(1)),
  type: z.enum(POST_TYPES),
  date: z.preprocess((value) => {
    if (value instanceof Date) return value;
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
      return new Date(`${value.trim()}T00:00:00.000Z`);
    }
    return value;
  }, z.coerce.date().refine((date) => !Number.isNaN(date.getTime()), { message: 'Invalid date' })),
  dek: optionalString,
  tags: z.preprocess((value) => {
    if (value == null || value === '') return undefined;
    if (typeof value === 'string') {
      return value
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean);
    }
    if (Array.isArray(value)) {
      return value.map((tag) => String(tag).trim()).filter(Boolean);
    }
    return undefined;
  }, z.array(z.string()).optional()),
  draft: optionalBool,
  /** Missing means comments are on. `false` hides the thread on that post. */
  comments: z.preprocess((value) => {
    if (value == null || value === '') return true;
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (['true', 'yes'].includes(normalized)) return true;
      if (['false', 'no'].includes(normalized)) return false;
    }
    if (typeof value === 'boolean') return value;
    return true;
  }, z.boolean()),
  author: optionalString,
  author_bio: optionalString,
  /** Path, filename, or wikilink for a picture in content/attachments. */
  image: optionalImage,
  image_alt: optionalString,
  rating: z.preprocess((value) => {
    if (value == null || value === '') return undefined;
    const number = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : Number.NaN;
    if (!Number.isFinite(number)) return undefined;
    return Math.min(5, Math.max(0, number));
  }, z.number().optional()),
});

export type PostData = z.infer<typeof postSchema>;
