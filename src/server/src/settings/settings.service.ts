import { Injectable } from '@nestjs/common';
import Database from 'better-sqlite3';
import { existsSync } from 'fs';
import {
  readAppConfig,
  writeAppConfig,
  resolveDatabasePath,
  resolveImagesPath,
  getProjectRoot,
  type AppConfig,
} from '../database/app-config';
import { EXPECTED_SQLITE_SCHEMA } from './expected-schema';
import {
  createNewDatabaseFile,
  synchronizeAndSeedDatabaseFile,
} from '../database/prepare-database-file';

@Injectable()
export class SettingsService {
  getConfig(): AppConfig {
    return readAppConfig();
  }

  updateConfig(partial: Partial<AppConfig>): AppConfig {
    writeAppConfig(partial);
    return readAppConfig();
  }

  getDatabasePath(): string {
    return resolveDatabasePath(readAppConfig());
  }

  /** Resolved images directory path, or null if not set. */
  getImagesPath(): string | null {
    return resolveImagesPath(readAppConfig());
  }

  getProjectRoot(): string {
    return getProjectRoot();
  }

  /**
   * Validate that the SQLite file at the given path has the required tables and columns.
   * Returns { valid: true } or { valid: false, error: string }.
   */
  validateDatabasePath(filePath: string): { valid: true } | { valid: false; error: string } {
    const normalized = filePath.trim();
    if (!normalized) {
      return { valid: false, error: 'Database path is required.' };
    }
    if (!existsSync(normalized)) {
      return { valid: false, error: 'File does not exist.' };
    }
    let db: Database.Database | null = null;
    try {
      db = new Database(normalized, { readonly: true });
      const tableNames = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all() as { name: string }[];
      const existingTables = new Set(tableNames.map((r) => r.name));

      for (const [table, requiredColumns] of Object.entries(EXPECTED_SQLITE_SCHEMA)) {
        if (!existingTables.has(table)) {
          return { valid: false, error: `Missing table: ${table}.` };
        }
        const rows = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
        const existingColumns = new Set(rows.map((r) => r.name));
        for (const col of requiredColumns) {
          if (!existingColumns.has(col)) {
            return { valid: false, error: `Table "${table}" is missing column: ${col}.` };
          }
        }
      }
      return { valid: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { valid: false, error: `Cannot open database: ${message}` };
    } finally {
      if (db) db.close();
    }
  }

  /**
   * Apply TypeORM synchronize on the file and insert only missing seed rows (assets, pair pips).
   * Safe for existing data: does not clear tables.
   */
  async prepareDatabaseFile(
    filePath: string,
  ): Promise<{ ok: true } | { ok: false; error: string }> {
    const normalized = filePath.trim();
    if (!normalized) {
      return { ok: false, error: 'Database path is required.' };
    }
    try {
      await synchronizeAndSeedDatabaseFile(normalized);
      return { ok: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { ok: false, error: message };
    }
  }

  async createDatabaseInDirectory(
    directory: string,
    fileName?: string,
  ): Promise<{ ok: true; path: string } | { ok: false; error: string }> {
    try {
      const absPath = await createNewDatabaseFile(directory, fileName);
      return { ok: true, path: absPath };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { ok: false, error: message };
    }
  }
}
