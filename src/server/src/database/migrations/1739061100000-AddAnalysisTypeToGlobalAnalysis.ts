import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAnalysisTypeToGlobalAnalysis1739061100000
  implements MigrationInterface
{
  name = 'AddAnalysisTypeToGlobalAnalysis1739061100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "global_analysis"
      ADD COLUMN "analysis_type" varchar(20) NOT NULL DEFAULT 'daily'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "global_analysis"
      DROP COLUMN "analysis_type"
    `);
  }
}
