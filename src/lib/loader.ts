import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { Loader, LoaderContext } from 'astro/loaders';
import { essayExcerptMarkdown } from './excerpt';
import { prepareObsidianMarkdown, resetContentScan, scanPosts, setContentRoot } from './obsidian';

/**
 * Reads Markdown from the top-level content folder. Files without the
 * magazine frontmatter are ignored. Drafts are not stored. Extra or broken
 * frontmatter is reported and skipped so a vault sync cannot fail the build.
 */
export function obsidianPostsLoader(): Loader {
  return {
    name: 'chuckwise-obsidian',
    load: async (context) => {
      const root = path.join(fileURLToPath(context.config.root), 'content');
      await sync(context, root);
      if (!context.watcher || hooked.has(context.watcher)) return;
      hooked.add(context.watcher);
      context.watcher.add(root);
      let timer: NodeJS.Timeout | undefined;
      const schedule = (changed: string) => {
        if (!changed.startsWith(root)) return;
        clearTimeout(timer);
        timer = setTimeout(() => {
          sync(context, root).catch((error: unknown) => {
            context.logger.error(error instanceof Error ? error.message : String(error));
          });
        }, 80);
      };
      context.watcher.on('add', schedule);
      context.watcher.on('change', schedule);
      context.watcher.on('unlink', schedule);
    },
  };
}

const hooked = new WeakSet<object>();

async function sync(context: LoaderContext, root: string) {
  if (!fs.existsSync(root)) {
    context.logger.warn(`No content folder at ${root}. Add Markdown posts there.`);
    for (const id of context.store.keys()) context.store.delete(id);
    return;
  }

  setContentRoot(root);
  resetContentScan();
  const scanned = scanPosts();
  const seen = new Set<string>();
  let ignored = 0;

  for (const item of scanned) {
    if (item.kind === 'draft') {
      context.logger.info(`Draft not published: ${item.filePath}`);
      continue;
    }
    if (item.kind === 'invalid') {
      context.logger.warn(`Skipping ${item.filePath} — ${item.reason ?? 'invalid frontmatter'}`);
      continue;
    }
    if (!item.data) continue;

    let data: Record<string, unknown>;
    try {
      data = await context.parseData({
        id: item.id,
        data: { ...item.data },
        filePath: item.filePath,
      });
    } catch (error) {
      context.logger.warn(
        `Skipping ${item.filePath} — ${error instanceof Error ? error.message : 'could not validate frontmatter'}`,
      );
      continue;
    }

    const fileURL = pathToFileURL(item.absPath);
    let rendered;
    try {
      rendered = await context.renderMarkdown(prepareObsidianMarkdown(item.body), { fileURL });
    } catch (error) {
      context.logger.warn(
        `Skipping ${item.filePath} — ${error instanceof Error ? error.message : 'could not render markdown'}`,
      );
      continue;
    }

    const excerpt = essayExcerptMarkdown(String(data.type ?? ''), item.body);
    if (excerpt) {
      try {
        const excerptRendered = await context.renderMarkdown(prepareObsidianMarkdown(excerpt), { fileURL });
        rendered = {
          html: rendered.html,
          metadata: {
            imagePaths: rendered.metadata?.imagePaths ?? [],
            ...rendered.metadata,
            excerptHtml: excerptRendered.html,
          },
        };
      } catch (error) {
        context.logger.warn(
          `Excerpt skipped for ${item.filePath} — ${error instanceof Error ? error.message : 'could not render excerpt'}`,
        );
      }
    }

    context.store.set({
      id: item.id,
      data,
      body: item.body,
      filePath: item.filePath,
      digest: context.generateDigest(item.raw),
      rendered,
    });
    seen.add(item.id);
  }

  for (const id of context.store.keys()) {
    if (!seen.has(id)) context.store.delete(id);
  }

  const published = seen.size;
  const skipped = scanned.filter((item) => item.kind !== 'post').length;
  ignored += skipped;
  context.logger.info(
    `ChuckWise: ${published} post${published === 1 ? '' : 's'} published${ignored ? `, ${ignored} skipped` : ''}.`,
  );
}
