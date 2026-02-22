import { DataSource } from 'typeorm';
import { existsSync, readFileSync } from 'fs';
import * as path from 'path';

/** Resolve project root (used when CLI runs from src/server). */
function getProjectRoot(): string {
  const cwd = process.cwd();
  const normalized = cwd.replace(/[/\\]+$/, '');
  if (normalized.endsWith('server') || normalized.endsWith('src\\server')) {
    return path.resolve(cwd, '..', '..');
  }
  return cwd;
}

function getDatabasePath(): string {
  const root = getProjectRoot();
  const configPath = path.join(root, 'app-config.json');
  if (!existsSync(configPath)) {
    return path.join(root, 'journal-app.db');
  }
  try {
    const raw = readFileSync(configPath, 'utf-8');
    const parsed = JSON.parse(raw) as { databasePath?: string };
    const p = (parsed.databasePath || 'journal-app.db').trim();
    return path.isAbsolute(p) ? path.normalize(p) : path.join(root, p);
  } catch {
    return path.join(root, 'journal-app.db');
  }
}

export default new DataSource({
  type: 'better-sqlite3',
  database: getDatabasePath(),
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  migrations: [],
  synchronize: false,
});
