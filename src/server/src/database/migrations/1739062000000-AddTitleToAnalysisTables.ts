import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddTitleToAnalysisTables1739062000000 implements MigrationInterface {
  name = 'AddTitleToAnalysisTables1739062000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'analysis',
      new TableColumn({
        name: 'title',
        type: 'varchar',
        length: '500',
        isNullable: true,
      }),
    );
    await queryRunner.addColumn(
      'global_analysis',
      new TableColumn({
        name: 'title',
        type: 'varchar',
        length: '500',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('global_analysis', 'title');
    await queryRunner.dropColumn('analysis', 'title');
  }
}
