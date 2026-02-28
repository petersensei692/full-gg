import { MigrationInterface, QueryRunner } from 'typeorm';

const isSQLite = (q: QueryRunner) =>
  q.connection.options.type === 'better-sqlite3' ||
  q.connection.options.type === 'sqlite';

export class AddNoteTypeColumn1739060900000 implements MigrationInterface {
  name = 'AddNoteTypeColumn1739060900000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (isSQLite(queryRunner)) {
      await queryRunner.query(
        `ALTER TABLE "notes" ADD COLUMN "type" varchar(20) DEFAULT 'other'`,
      );
    } else {
      await queryRunner.query(
        `ALTER TABLE "notes" ADD COLUMN "type" varchar(20) DEFAULT 'other'`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (isSQLite(queryRunner)) {
      await queryRunner.query(
        `CREATE TABLE "notes_new" ("id" varchar PRIMARY KEY NOT NULL, "title" varchar(500) NOT NULL, "note" text NOT NULL, "tier" varchar(10) DEFAULT 'tier_2', "created_at" datetime NOT NULL, "updated_at" datetime NOT NULL)`,
      );
      await queryRunner.query(
        `INSERT INTO "notes_new" ("id", "title", "note", "tier", "created_at", "updated_at") SELECT "id", "title", "note", "tier", "created_at", "updated_at" FROM "notes"`,
      );
      await queryRunner.query(`DROP TABLE "notes"`);
      await queryRunner.query(`ALTER TABLE "notes_new" RENAME TO "notes"`);
    } else {
      await queryRunner.query(`ALTER TABLE "notes" DROP COLUMN "type"`);
    }
  }
}
