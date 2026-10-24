/**
 * Long essays are shortened in the stream. Short takes and reviews are not.
 * The cut is by whole Markdown blocks so a link or a paragraph is never split.
 */

const EXCERPT_AFTER_WORDS = 280;
const EXCERPT_KEEP_WORDS = 150;

export function wordCount(body: string | undefined): number {
  if (!body) return 0;
  const words = body
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[#>*_`[\]()]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  return words.length;
}

export function blocksOf(body: string): string[] {
  const blocks: string[] = [];
  let current: string[] = [];
  let inFence = false;

  const flush = () => {
    const text = current.join('\n').trim();
    current = [];
    if (text) blocks.push(text);
  };

  for (const line of body.split('\n')) {
    if (/^```/.test(line.trim())) {
      inFence = !inFence;
      current.push(line);
      continue;
    }
    if (!inFence && line.trim() === '') {
      flush();
      continue;
    }
    current.push(line);
  }
  flush();
  return blocks;
}

/**
 * Markdown to show for a long essay, or undefined when the piece should
 * be rendered in full.
 */
export function essayExcerptMarkdown(type: string, body: string): string | undefined {
  if (type !== 'essay') return undefined;
  if (wordCount(body) <= EXCERPT_AFTER_WORDS) return undefined;

  const blocks = blocksOf(body);
  const kept: string[] = [];
  let words = 0;
  for (const block of blocks) {
    kept.push(block);
    words += wordCount(block);
    if (words >= EXCERPT_KEEP_WORDS) break;
  }
  if (kept.length === 0 || kept.length === blocks.length) return undefined;
  return kept.join('\n\n');
}
