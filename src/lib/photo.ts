import { existsSync } from 'node:fs';
import { join } from 'node:path';

/** True only when Chuck's photo is actually in the site. Missing file, no image. */
export function hasAuthorPhoto(): boolean {
  return existsSync(join(process.cwd(), 'public', 'images', 'chuck.jpg'));
}
