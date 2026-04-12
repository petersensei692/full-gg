import { MigrationInterface, QueryRunner } from 'typeorm';

const isSQLite = (q: QueryRunner) =>
  q.connection.options.type === 'better-sqlite3' ||
  q.connection.options.type === 'sqlite';

/**
 * Clears weekly calendars and events, then replaces event text fields with pasted images only.
 * Run when not relying on TypeORM synchronize alone (e.g. CLI migration).
 */
export class WipeCalendarsAndEventImagesSchema1739061700000
  implements MigrationInterface
{
  name = 'WipeCalendarsAndEventImagesSchema1739061700000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM "events"`);
    await queryRunner.query(`DELETE FROM "asset_calendar"`);
    await queryRunner.query(`DELETE FROM "weekly_calendar"`);

    if (isSQLite(queryRunner)) {
      await queryRunner.query(`PRAGMA foreign_keys = OFF`);
      await queryRunner.query(`DROP INDEX IF EXISTS "IDX_events_asset_calendar"`);
      await queryRunner.query(`DROP INDEX IF EXISTS "IDX_events_calendar"`);
      await queryRunner.query(`DROP INDEX IF EXISTS "IDX_events_asset"`);
      await queryRunner.query(`DROP TABLE IF EXISTS "events"`);
      await queryRunner.query(`
        CREATE TABLE "events" (
          "id" varchar PRIMARY KEY NOT NULL,
          "calendar_id" varchar,
          "asset_calendar_id" varchar,
          "day" varchar(50) NOT NULL,
          "asset_id" varchar NOT NULL,
          "events_images" text,
          "created_at" datetime NOT NULL DEFAULT (datetime('now')),
          "updated_at" datetime NOT NULL DEFAULT (datetime('now')),
          CONSTRAINT "FK_events_weekly_calendar" FOREIGN KEY ("calendar_id") REFERENCES "weekly_calendar" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
          CONSTRAINT "FK_events_asset_calendar" FOREIGN KEY ("asset_calendar_id") REFERENCES "asset_calendar" ("id") ON DELETE SET NULL ON UPDATE NO ACTION,
          CONSTRAINT "FK_events_asset" FOREIGN KEY ("asset_id") REFERENCES "assets" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        )
      `);
      await queryRunner.query(
        `CREATE INDEX "IDX_events_calendar_id" ON "events" ("calendar_id")`,
      );
      await queryRunner.query(
        `CREATE INDEX "IDX_events_asset_calendar_id" ON "events" ("asset_calendar_id")`,
      );
      await queryRunner.query(
        `CREATE INDEX "IDX_events_asset_id" ON "events" ("asset_id")`,
      );
      await queryRunner.query(`PRAGMA foreign_keys = ON`);
    } else {
      await queryRunner.query(`ALTER TABLE "events" DROP COLUMN IF EXISTS "time"`);
      await queryRunner.query(`ALTER TABLE "events" DROP COLUMN IF EXISTS "name"`);
      await queryRunner.query(`ALTER TABLE "events" DROP COLUMN IF EXISTS "impact"`);
      await queryRunner.query(
        `ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "events_images" text`,
      );
    }
  }

  public async down(): Promise<void> {
    // Irreversible data wipe; schema restore omitted.
  }
}
