import { MigrationInterface, QueryRunner } from 'typeorm';

const isSQLite = (q: QueryRunner) =>
  q.connection.options.type === 'better-sqlite3' ||
  q.connection.options.type === 'sqlite';

export class AddFinishedToWatchItems1739061200000 implements MigrationInterface {
  name = 'AddFinishedToWatchItems1739061200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (isSQLite(queryRunner)) {
      await queryRunner.query(`
        ALTER TABLE "watch_items" ADD COLUMN "finished" INTEGER NOT NULL DEFAULT 0
      `);
    } else {
      await queryRunner.query(`
        ALTER TABLE "watch_items" ADD COLUMN "finished" boolean NOT NULL DEFAULT false
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (isSQLite(queryRunner)) {
      await queryRunner.query(`ALTER TABLE "watch_items" DROP COLUMN "finished"`);
    } else {
      await queryRunner.query(`ALTER TABLE "watch_items" DROP COLUMN "finished"`);
    }
  }
}
