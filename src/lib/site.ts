export const site = {
  name: 'ChuckWise',
  url: 'https://chouseworth.com',
  description: 'A personal magazine of essays, short takes, and reviews. Published by Chuck Houseworth.',
  author: 'Chuck Houseworth',
  tagline: 'Published by Chuck Houseworth',
  locale: 'en_US',
  /**
   * Cusdis app id from https://cusdis.com. Leave this empty and comment
   * threads are left off the pages. The id is public; it ships in the HTML.
   */
  cusdisAppId: '',
  /** Cusdis host. The default service is https://cusdis.com. */
  cusdisHost: 'https://cusdis.com',
} as const;

export const POST_TYPES = ['essay', 'short-take', 'review'] as const;
export type PostType = (typeof POST_TYPES)[number];

export interface Section {
  type: PostType;
  slug: string;
  label: string;
  nav: string;
  sup: string;
  intro: string;
}

export const sections: readonly Section[] = [
  {
    type: 'essay',
    slug: 'essays',
    label: 'Essays',
    nav: 'Essays',
    sup: 'Long form',
    intro: 'Longer commentary. An argument with room to breathe.',
  },
  {
    type: 'short-take',
    slug: 'short-takes',
    label: 'Short Takes',
    nav: 'Short Takes',
    sup: 'Brief',
    intro: 'A few hundred words, written fast and meant to be read that way.',
  },
  {
    type: 'review',
    slug: 'reviews',
    label: 'Reviews',
    nav: 'Reviews',
    sup: 'Verdicts',
    intro: 'What I made of something, and whether it was worth the time.',
  },
] as const;

export function sectionForType(type: PostType): Section {
  const found = sections.find((section) => section.type === type);
  if (!found) throw new Error(`Unknown post type: ${type}`);
  return found;
}

export function sectionForSlug(slug: string): Section | undefined {
  return sections.find((section) => section.slug === slug);
}

export function postPath(type: PostType, id: string): string {
  return `/${sectionForType(type).slug}/${id}/`;
}

/** Singular labels used on cards and article kickers. */
export const typeKicker: Record<PostType, string> = {
  essay: 'Essay',
  'short-take': 'Short Take',
  review: 'Review',
};
