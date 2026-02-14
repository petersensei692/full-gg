import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateWeeklyWatchlistTable1739060100000
  implements MigrationInterface
{
  name = 'CreateWeeklyWatchlistTable1739060100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(`
      CREATE TABLE "weekly_watchlist" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "start_date" TIMESTAMP WITH TIME ZONE NOT NULL,
        "end_date" TIMESTAMP WITH TIME ZONE NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_weekly_watchlist_id" PRIMARY KEY ("id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "weekly_watchlist"`);
  }
}
