import {readdir, readFile} from 'node:fs/promises';
import {join} from 'node:path';
import postgres from 'postgres';

import {config} from './config';
import {log} from './logger';

const connectionString = config.databaseUrl ||
    'postgres://postgres:postgres@127.0.0.1:5432/geo_mock';

export const sql = postgres(connectionString, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

async function runMigrations() {
  const migrationsDir = join(process.cwd(), 'apps/server/migrations');

  try {
    const files = await readdir(migrationsDir);
    const sqlFiles = files.filter((f) => f.endsWith('.sql')).sort();

    for (const file of sqlFiles) {
      log('info', `running migration: ${file}`);
      const content = await readFile(join(migrationsDir, file), 'utf8');
      // Execute as a single block.
      await sql.unsafe(content);
    }
    log('info', 'migrations completed successfully');
  } catch (error) {
    log('error', 'migration failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

export const connectDb = async () => {
  await sql`select 1`;
  await runMigrations();
};

export const closeDb = async () => {
  await sql.end();
};
