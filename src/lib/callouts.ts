import { defineMdastPlugin } from 'satteri';

const SAFE_TYPE = /[^a-z0-9-]/g;

/**
 * Turns the sentinel blockquotes produced by the Obsidian preprocessor
 * into <aside class="callout">. Ordinary blockquotes are left alone.
 */
export const obsidianCallouts = defineMdastPlugin({
  name: 'obsidian-callouts',
  blockquote(node, ctx) {
    const first = node.children?.find((child) => child.type === 'paragraph');
    if (!first) return;
    const raw = ctx.textContent(first);
    const match = raw.match(/^\[callout:([a-z0-9-]+)\]\s*([\s\S]*)$/i);
    if (!match) return;
    const type = match[1].toLowerCase().replace(SAFE_TYPE, '');
    const label = match[2].trim();
    ctx.setProperty(node, 'data', {
      hName: 'aside',
      hProperties: { className: ['callout', `callout-${type}`] },
    });
    ctx.setProperty(first, 'data', {
      hProperties: { className: ['callout-label'] },
    });
    const textNode = first.children?.find((child) => child.type === 'text');
    if (!textNode) return;
    ctx.setProperty(textNode, 'value', label);
    const children = first.children ?? [];
    for (let index = children.length - 1; index >= 0; index -= 1) {
      if (children[index] !== textNode) ctx.removeChildAt(first, index);
    }
  },
});
