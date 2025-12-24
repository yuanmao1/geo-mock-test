import type { Elysia } from 'elysia';
import { join } from 'path';

export function registerStaticRoutes(app: any) {
  return app.get('*', async ({ path, set }: { path: string; set: any }) => {
    if (path.startsWith('/api')) {
      set.status = 404;
      return { error: 'Not Found' };
    }

    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    const filePath = cleanPath === '' ? 'index.html' : cleanPath;

    const file = Bun.file(join('public', filePath));
    if (await file.exists()) return file;

    const index = Bun.file(join('public', 'index.html'));
    if (await index.exists()) return index;

    set.status = 404;
    return { error: 'Not Found' };
  });
}
