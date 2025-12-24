import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { log } from './logger';
import { registerApiRoutes } from './routes/api';
import { registerStaticRoutes } from './routes/static';

const PORT = Bun.env.PORT ? parseInt(Bun.env.PORT) : 3000;

const app = new Elysia()
  .use(cors())
  .derive(() => ({ startTime: performance.now() }))
  .onAfterHandle(({ request, set, startTime }) => {
    const pathname = new URL(request.url).pathname;
    if (!pathname.startsWith('/api')) return;

    const durationMs = Math.round(performance.now() - (startTime ?? performance.now()));
    log('info', 'request', { method: request.method, path: pathname, status: set.status ?? 200, durationMs });
  })
  .onError(({ request, error, code, set, startTime }) => {
    const pathname = new URL(request.url).pathname;
    const durationMs = Math.round(performance.now() - (startTime ?? performance.now()));
    log('error', 'request error', {
      method: request.method,
      path: pathname,
      code,
      status: set.status ?? 500,
      durationMs,
      error: String(error)
    });
  });

registerApiRoutes(app);
registerStaticRoutes(app);

app.listen(PORT);
log('info', 'server started', { host: app.server?.hostname, port: app.server?.port });

