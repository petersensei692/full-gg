import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateWatchItemsTable1739060200000
  implements MigrationInterface
{
  name = 'CreateWatchItemsTable1739060200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(`
      CREATE TABLE "watch_items" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "watchlist_id" uuid NOT NULL,
        "base_asset_id" uuid NOT NULL,
        "quote_asset_id" uuid NOT NULL,
        "pair_name" character varying(255) NOT NULL,
        "bias" character varying(100) NOT NULL,
        "thesis" jsonb,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_watch_items_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_watch_items_watchlist" FOREIGN KEY ("watchlist_id") 
          REFERENCES "weekly_watchlist"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_watch_items_base_asset" FOREIGN KEY ("base_asset_id") 
          REFERENCES "assets"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_watch_items_quote_asset" FOREIGN KEY ("quote_asset_id") 
          REFERENCES "assets"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_watch_items_watchlist" ON "watch_items" ("watchlist_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_watch_items_base_asset" ON "watch_items" ("base_asset_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_watch_items_quote_asset" ON "watch_items" ("quote_asset_id")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "watch_items"`);
  }
}
