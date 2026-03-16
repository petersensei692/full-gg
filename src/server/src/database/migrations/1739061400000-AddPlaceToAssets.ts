import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPlaceToAssets1739061400000 implements MigrationInterface {
  name = 'AddPlaceToAssets1739061400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "assets" ADD COLUMN "place" integer NOT NULL DEFAULT 1
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "assets" DROP COLUMN "place"`);
  }
}
