import {cors} from '@elysiajs/cors';
import {Elysia} from 'elysia';

import {config} from './lib/config';
import {closeDb, connectDb} from './lib/db';
import {log} from './lib/logger';
import {registerApiRoutes} from './routes/api';
import {registerStaticRoutes} from './routes/static';

const app =
    new Elysia()
        .use(cors())
        .derive(() => ({startTime: performance.now()}))
        .onAfterHandle(({request, set, startTime}) => {
          const pathname = new URL(request.url).pathname;
          if (!pathname.startsWith(config.apiPrefix)) return;

          const durationMs =
              Math.round(performance.now() - (startTime ?? performance.now()));
          log('info', 'request', {
            method: request.method,
            path: pathname,
            status: set.status ?? 200,
            durationMs,
          });
        })
        .onError(({request, error, code, set, startTime}) => {
          const pathname = new URL(request.url).pathname;
          const durationMs =
              Math.round(performance.now() - (startTime ?? performance.now()));
          log('error', 'request error', {
            method: request.method,
            path: pathname,
            code,
            status: set.status ?? 500,
            durationMs,
            error: String(error),
          });
        });

app.onStart(async () => {
  try {
    await connectDb();
    log('info', 'database connected');
  } catch (error) {
    log('error', 'database connection failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
});

app.onStop(async () => {
  await closeDb();
  log('info', 'database connection closed');
});

registerApiRoutes(app, config.apiPrefix);
registerStaticRoutes(app);

app.listen({
  port: config.port,
  hostname: '0.0.0.0',
});

log('info', 'server started', {
  host: app.server?.hostname,
  port: app.server?.port,
});
