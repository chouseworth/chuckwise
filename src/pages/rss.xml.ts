import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { site } from '../lib/site';
import { getPublished, hrefFor, plainTitle } from '../lib/posts';

export async function GET(context: APIContext) {
  const posts = await getPublished();
  return rss({
    title: site.name,
    description: site.description,
    site: context.site ?? site.url,
    trailingSlash: true,
    customData: '<language>en-us</language>',
    items: posts.map((post) => ({
      title: plainTitle(post.data.title),
      description: post.data.dek,
      pubDate: post.data.date,
      link: hrefFor(post),
      categories: post.data.tags,
    })),
  });
}
