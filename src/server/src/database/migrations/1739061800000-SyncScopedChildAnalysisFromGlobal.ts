import { MigrationInterface, QueryRunner } from 'typeorm';

const isSQLite = (q: QueryRunner) =>
  q.connection.options.type === 'better-sqlite3' ||
  q.connection.options.type === 'sqlite';

/**
 * Asset-scoped copies of a global template (`scope_label` ≠ GLOBAL) must match the parent
 * `global_analysis` row. Aligns legacy rows created before server-side propagation existed.
 */
export class SyncScopedChildAnalysisFromGlobal1739061800000 implements MigrationInterface {
  name = 'SyncScopedChildAnalysisFromGlobal1739061800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const favFallback = isSQLite(queryRunner) ? '0' : 'false';
    await queryRunner.query(`
      UPDATE analysis AS a
      SET
        notes = (
          SELECT '<!--analysis-type:' || g.analysis_type || '-->' || COALESCE(g.notes, '')
          FROM global_analysis g WHERE g.id = a.global_analysis_id
        ),
        images = (SELECT g.images FROM global_analysis g WHERE g.id = a.global_analysis_id),
        image_names = (SELECT g.image_names FROM global_analysis g WHERE g.id = a.global_analysis_id),
        favorite = COALESCE((SELECT g.favorite FROM global_analysis g WHERE g.id = a.global_analysis_id), ${favFallback})
      WHERE a.global_analysis_id IS NOT NULL
        AND a.scope_label IS NOT NULL
        AND a.scope_label != 'GLOBAL'
        AND EXISTS (SELECT 1 FROM global_analysis g WHERE g.id = a.global_analysis_id)
    `);
  }

  public async down(): Promise<void> {
    // Prior child row contents are not recoverable
  }
}
