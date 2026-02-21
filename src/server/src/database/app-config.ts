import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import * as path from 'path';

export interface AppConfig {
  databasePath: string;
  imagesPath: string;
}

const CONFIG_FILENAME = 'app-config.json';

/** When running from project root, cwd is root. When running "cd src/server && nest start", cwd is src/server. */
export function getProjectRoot(): string {
  const cwd = process.cwd();
  const normalized = cwd.replace(/[/\\]+$/, '');
  if (normalized.endsWith('server') || normalized.endsWith('src\\server')) {
    return path.resolve(cwd, '..', '..');
  }
  return cwd;
}

function getConfigPath(): string {
  return path.join(getProjectRoot(), CONFIG_FILENAME);
}

const DEFAULT_CONFIG: AppConfig = {
  databasePath: 'full-gg.db',
  imagesPath: '',
};

export function readAppConfig(): AppConfig {
  const configPath = getConfigPath();
  if (!existsSync(configPath)) {
    return { ...DEFAULT_CONFIG };
  }
  try {
    const raw = readFileSync(configPath, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<AppConfig>;
    return {
      databasePath: typeof parsed.databasePath === 'string' ? parsed.databasePath : DEFAULT_CONFIG.databasePath,
      imagesPath: typeof parsed.imagesPath === 'string' ? parsed.imagesPath : DEFAULT_CONFIG.imagesPath,
    };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export function writeAppConfig(config: Partial<AppConfig>): void {
  const configPath = getConfigPath();
  const current = readAppConfig();
  const next: AppConfig = {
    databasePath: config.databasePath ?? current.databasePath,
    imagesPath: config.imagesPath ?? current.imagesPath,
  };
  const dir = path.dirname(configPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(configPath, JSON.stringify(next, null, 2), 'utf-8');
}

/** Strip surrounding quotes so paths like "C:\path" are used as absolute. */
function stripPathQuotes(s: string): string {
  return s.replace(/^["']+|["']+$/g, '').trim();
}

/** Resolve database path to absolute. If relative, resolve against project root. */
export function resolveDatabasePath(config: AppConfig): string {
  const root = getProjectRoot();
  const p = stripPathQuotes(config.databasePath || 'full-gg.db') || 'full-gg.db';
  return path.isAbsolute(p) ? path.normalize(p) : path.join(root, p);
}

/** Resolve images path to absolute. If relative, resolve against project root. Empty means not set. */
export function resolveImagesPath(config: AppConfig): string | null {
  const p = stripPathQuotes(config.imagesPath || '');
  if (!p) return null;
  const root = getProjectRoot();
  return path.isAbsolute(p) ? path.normalize(p) : path.join(root, p);
}
