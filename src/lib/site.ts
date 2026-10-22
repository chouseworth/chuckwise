export const site = {
  name: 'ChuckWise',
  url: 'https://chouseworth.com',
  description:
    'A personal magazine of essays, short takes, reviews, notes, and conversations by Chuck Houseworth. Commentary, mostly mine.',
  author: 'Chuck Houseworth',
  tagline: 'Commentary, mostly mine',
  volume: '01',
  issue: '01',
  season: 'Autumn 2026',
  locale: 'en_US',
  /** Monday the weekly featured slot counts from. */
  rotationEpoch: '2026-01-05',
} as const;

export const POST_TYPES = ['essay', 'short-take', 'review', 'note', 'conversation'] as const;
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
  {
    type: 'note',
    slug: 'notes',
    label: 'Notes & Links',
    nav: 'Notes & Links',
    sup: 'The rail',
    intro: 'A link worth your time, with a short take attached.',
  },
  {
    type: 'conversation',
    slug: 'conversations',
    label: 'Conversations',
    nav: 'Conversations',
    sup: 'Q&A',
    intro: 'Exchanges. Whoever is speaking is named in the piece.',
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
  note: 'Note',
  conversation: 'Conversation',
};
