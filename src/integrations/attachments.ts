import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AstroIntegration } from 'astro';

const TYPES: Record<string, string> = {
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.txt': 'text/plain; charset=utf-8',
};

/** Serves content/attachments in dev and copies the folder into the build. */
export function attachments(): AstroIntegration {
  const root = path.resolve('content/attachments');
  return {
    name: 'chuckwise-attachments',
    hooks: {
      'astro:server:setup': ({ server }) => {
        server.middlewares.use((req, res, next) => {
          const raw = req.url?.split('?')[0] ?? '';
          if (!raw.startsWith('/attachments/')) {
            next();
            return;
          }
          let rel = raw.slice('/attachments/'.length);
          try {
            rel = decodeURIComponent(rel);
          } catch {
            res.statusCode = 400;
            res.end('Bad path');
            return;
          }
          if (!rel || rel.includes('\0') || path.isAbsolute(rel)) {
            res.statusCode = 400;
            res.end('Bad path');
            return;
          }
          const file = path.resolve(root, rel);
          const relative = path.relative(root, file);
          if (relative.startsWith('..') || path.isAbsolute(relative)) {
            res.statusCode = 400;
            res.end('Bad path');
            return;
          }
          if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
            next();
            return;
          }
          res.setHeader('Content-Type', TYPES[path.extname(file).toLowerCase()] ?? 'application/octet-stream');
          fs.createReadStream(file).pipe(res);
        });
      },
      'astro:build:done': ({ dir }) => {
        if (!fs.existsSync(root)) return;
        const out = path.join(fileURLToPath(dir), 'attachments');
        fs.cpSync(root, out, {
          recursive: true,
          filter: (source) => !path.basename(source).startsWith('.'),
        });
      },
    },
  };
}
