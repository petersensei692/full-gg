import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Child `analysis` rows created from `global_analysis` had `favorite` stuck false
 * while `global_analysis.favorite` could be true — asset streams use per-row `favorite`
 * for the favorites filter. Align children with their parent global row.
 */
export class SyncChildAnalysisFavoriteFromGlobal1739061600000 implements MigrationInterface {
  name = 'SyncChildAnalysisFavoriteFromGlobal1739061600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE analysis
      SET favorite = (
        SELECT g.favorite FROM global_analysis g WHERE g.id = analysis.global_analysis_id
      )
      WHERE global_analysis_id IS NOT NULL
    `);
  }

  public async down(): Promise<void> {
    // Previous favorite flags are not recoverable
  }
}
