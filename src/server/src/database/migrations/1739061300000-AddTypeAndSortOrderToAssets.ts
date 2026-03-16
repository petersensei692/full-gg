import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTypeAndSortOrderToAssets1739061300000 implements MigrationInterface {
  name = 'AddTypeAndSortOrderToAssets1739061300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "assets" ADD COLUMN "type" varchar(50) NOT NULL DEFAULT 'currency'
    `);
    await queryRunner.query(`
      ALTER TABLE "assets" ADD COLUMN "sort_order" integer NOT NULL DEFAULT 0
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "assets" DROP COLUMN "sort_order"`);
    await queryRunner.query(`ALTER TABLE "assets" DROP COLUMN "type"`);
  }
}
