import { defineCollection } from 'astro:content';
import { obsidianPostsLoader } from './lib/loader';
import { postSchema } from './lib/schema';

export const collections = {
  posts: defineCollection({
    loader: obsidianPostsLoader(),
    schema: postSchema,
  }),
};
