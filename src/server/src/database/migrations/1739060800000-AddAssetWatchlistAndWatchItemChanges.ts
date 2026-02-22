import { MigrationInterface, QueryRunner } from 'typeorm';

const isSQLite = (q: QueryRunner) =>
  q.connection.options.type === 'better-sqlite3' ||
  q.connection.options.type === 'sqlite';

export class AddAssetWatchlistAndWatchItemChanges1739060800000
  implements MigrationInterface
{
  name = 'AddAssetWatchlistAndWatchItemChanges1739060800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (isSQLite(queryRunner)) {
      await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS "asset_watchlist" (
          "id" TEXT PRIMARY KEY,
          "start_date" DATETIME NOT NULL,
          "end_date" DATETIME NOT NULL,
          "weekly_watchlist_id" TEXT NOT NULL,
          "asset_id" TEXT NOT NULL,
          "created_at" DATETIME NOT NULL DEFAULT (datetime('now')),
          "updated_at" DATETIME NOT NULL DEFAULT (datetime('now')),
          CONSTRAINT "FK_asset_watchlist_weekly" FOREIGN KEY ("weekly_watchlist_id")
            REFERENCES "weekly_watchlist"("id") ON DELETE CASCADE,
          CONSTRAINT "FK_asset_watchlist_asset" FOREIGN KEY ("asset_id")
            REFERENCES "assets"("id")
        )
      `);
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "IDX_asset_watchlist_weekly" ON "asset_watchlist" ("weekly_watchlist_id")`,
      );
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "IDX_asset_watchlist_asset" ON "asset_watchlist" ("asset_id")`,
      );
      try {
        await queryRunner.query(
          `ALTER TABLE "watch_items" ADD COLUMN "base_asset_watchlist_id" TEXT`,
        );
      } catch {}
      try {
        await queryRunner.query(
          `ALTER TABLE "watch_items" ADD COLUMN "quote_asset_watchlist_id" TEXT`,
        );
      } catch {}
    } else {
      await queryRunner.query(`
        CREATE TABLE "asset_watchlist" (
          "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
          "start_date" TIMESTAMP NOT NULL,
          "end_date" TIMESTAMP NOT NULL,
          "weekly_watchlist_id" uuid NOT NULL,
          "asset_id" uuid NOT NULL,
          "created_at" TIMESTAMP NOT NULL DEFAULT now(),
          "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
          CONSTRAINT "PK_asset_watchlist_id" PRIMARY KEY ("id"),
          CONSTRAINT "FK_asset_watchlist_weekly" FOREIGN KEY ("weekly_watchlist_id")
            REFERENCES "weekly_watchlist"("id") ON DELETE CASCADE,
          CONSTRAINT "FK_asset_watchlist_asset" FOREIGN KEY ("asset_id")
            REFERENCES "assets"("id") ON DELETE RESTRICT
        )
      `);
      await queryRunner.query(
        `CREATE INDEX "IDX_asset_watchlist_weekly" ON "asset_watchlist" ("weekly_watchlist_id")`,
      );
      await queryRunner.query(
        `CREATE INDEX "IDX_asset_watchlist_asset" ON "asset_watchlist" ("asset_id")`,
      );
      await queryRunner.query(
        `ALTER TABLE "watch_items" ADD "base_asset_watchlist_id" uuid`,
      );
      await queryRunner.query(
        `ALTER TABLE "watch_items" ADD "quote_asset_watchlist_id" uuid`,
      );
      await queryRunner.query(`
        ALTER TABLE "watch_items" ADD CONSTRAINT "FK_watch_items_base_aw"
          FOREIGN KEY ("base_asset_watchlist_id") REFERENCES "asset_watchlist"("id") ON DELETE CASCADE
      `);
      await queryRunner.query(`
        ALTER TABLE "watch_items" ADD CONSTRAINT "FK_watch_items_quote_aw"
          FOREIGN KEY ("quote_asset_watchlist_id") REFERENCES "asset_watchlist"("id") ON DELETE CASCADE
      `);
      await queryRunner.query(
        `ALTER TABLE "watch_items" ALTER COLUMN "watchlist_id" DROP NOT NULL`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (isSQLite(queryRunner)) {
      await queryRunner.query(`DROP INDEX IF EXISTS "IDX_asset_watchlist_asset"`);
      await queryRunner.query(`DROP INDEX IF EXISTS "IDX_asset_watchlist_weekly"`);
      await queryRunner.query(`DROP TABLE "asset_watchlist"`);
    } else {
      await queryRunner.query(
        `ALTER TABLE "watch_items" ALTER COLUMN "watchlist_id" SET NOT NULL`,
      );
      await queryRunner.query(
        `ALTER TABLE "watch_items" DROP CONSTRAINT "FK_watch_items_quote_aw"`,
      );
      await queryRunner.query(
        `ALTER TABLE "watch_items" DROP CONSTRAINT "FK_watch_items_base_aw"`,
      );
      await queryRunner.query(
        `ALTER TABLE "watch_items" DROP COLUMN "quote_asset_watchlist_id"`,
      );
      await queryRunner.query(
        `ALTER TABLE "watch_items" DROP COLUMN "base_asset_watchlist_id"`,
      );
      await queryRunner.query(`DROP INDEX "IDX_asset_watchlist_asset"`);
      await queryRunner.query(`DROP INDEX "IDX_asset_watchlist_weekly"`);
      await queryRunner.query(`DROP TABLE "asset_watchlist"`);
    }
  }
}
