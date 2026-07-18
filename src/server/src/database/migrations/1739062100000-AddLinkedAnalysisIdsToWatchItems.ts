import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddLinkedAnalysisIdsToWatchItems1739062100000 implements MigrationInterface {
  name = 'AddLinkedAnalysisIdsToWatchItems1739062100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'watch_items',
      new TableColumn({
        name: 'linked_base_analysis_ids',
        type: 'text',
        isNullable: true,
      }),
    );
    await queryRunner.addColumn(
      'watch_items',
      new TableColumn({
        name: 'linked_quote_analysis_ids',
        type: 'text',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('watch_items', 'linked_quote_analysis_ids');
    await queryRunner.dropColumn('watch_items', 'linked_base_analysis_ids');
  }
}
