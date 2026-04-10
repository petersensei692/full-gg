import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddFavoriteToAnalysisTables1739061500000 implements MigrationInterface {
  name = 'AddFavoriteToAnalysisTables1739061500000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'analysis',
      new TableColumn({
        name: 'favorite',
        type: 'boolean',
        default: false,
      }),
    );
    await queryRunner.addColumn(
      'global_analysis',
      new TableColumn({
        name: 'favorite',
        type: 'boolean',
        default: false,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('global_analysis', 'favorite');
    await queryRunner.dropColumn('analysis', 'favorite');
  }
}
