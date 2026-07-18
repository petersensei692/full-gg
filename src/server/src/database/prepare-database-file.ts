import Database from 'better-sqlite3';
import { existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { DataSource } from 'typeorm';
import { seedAssets } from './seeds/asset.seed';
import { seedPairs } from './seeds/analytics.seed';

function entitiesGlob(): string {
  return join(__dirname, '..', '**', '*.entity.js');
}

/**
 * Ensure schema exists (TypeORM synchronize) and insert missing seed rows only.
 * Does not delete user data.
 */
export async function synchronizeAndSeedDatabaseFile(absPath: string): Promise<void> {
  const dir = dirname(absPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  if (!existsSync(absPath)) {
    const db = new Database(absPath);
    db.close();
  }

  const ds = new DataSource({
    type: 'better-sqlite3',
    database: absPath,
    entities: [entitiesGlob()],
    synchronize: true,
  });
  await ds.initialize();
  try {
    await seedAssets(ds);
    await seedPairs(ds);
  } finally {
    await ds.destroy();
  }
}

/** Create a new SQLite file in `directory` and apply schema + essential seeds. */
export async function createNewDatabaseFile(directory: string, fileName = 'gg-journal.sqlite'): Promise<string> {
  const normalizedDir = directory.trim();
  if (!normalizedDir) {
    throw new Error('Directory is required.');
  }
  const safeName = fileName.trim() || 'gg-journal.sqlite';
  const absPath = join(normalizedDir, safeName);
  if (existsSync(absPath)) {
    throw new Error(`File already exists: ${absPath}`);
  }
  mkdirSync(normalizedDir, { recursive: true });
  const db = new Database(absPath);
  db.close();
  await synchronizeAndSeedDatabaseFile(absPath);
  return absPath;
}
