import { MigrationInterface, QueryRunner } from 'typeorm';

const isSQLite = (q: QueryRunner) =>
  q.connection.options.type === 'better-sqlite3' ||
  q.connection.options.type === 'sqlite';

/**
 * Removes economic-events and weekly-calendar domains (events, asset_calendar, weekly_calendar).
 * Weekly **watchlist** tables (`weekly_watchlist`, `asset_watchlist`, `watch_items`) are unchanged.
 */
export class DropEventsAndWeeklyCalendarTables1739061900000
  implements MigrationInterface
{
  name = 'DropEventsAndWeeklyCalendarTables1739061900000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (isSQLite(queryRunner)) {
      await queryRunner.query(`PRAGMA foreign_keys = OFF`);
      await queryRunner.query(`DROP INDEX IF EXISTS "IDX_events_calendar_id"`);
      await queryRunner.query(`DROP INDEX IF EXISTS "IDX_events_asset_calendar_id"`);
      await queryRunner.query(`DROP INDEX IF EXISTS "IDX_events_asset_id"`);
      await queryRunner.query(`DROP INDEX IF EXISTS "IDX_events_calendar"`);
      await queryRunner.query(`DROP INDEX IF EXISTS "IDX_events_asset"`);
      await queryRunner.query(`DROP INDEX IF EXISTS "IDX_events_asset_calendar"`);
      await queryRunner.query(`DROP TABLE IF EXISTS "events"`);
      await queryRunner.query(`DROP INDEX IF EXISTS "IDX_asset_calendar_weekly_calendar"`);
      await queryRunner.query(`DROP INDEX IF EXISTS "IDX_asset_calendar_asset"`);
      await queryRunner.query(`DROP TABLE IF EXISTS "asset_calendar"`);
      await queryRunner.query(`DROP TABLE IF EXISTS "weekly_calendar"`);
      await queryRunner.query(`PRAGMA foreign_keys = ON`);
    } else {
      await queryRunner.query(`DROP TABLE IF EXISTS "events" CASCADE`);
      await queryRunner.query(`DROP TABLE IF EXISTS "asset_calendar" CASCADE`);
      await queryRunner.query(`DROP TABLE IF EXISTS "weekly_calendar" CASCADE`);
    }
  }

  public async down(): Promise<void> {
    /* Removed intentionally — irreversible drop. */
  }
}
