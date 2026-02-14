import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateEventsTable1739060300000 implements MigrationInterface {
  name = 'CreateEventsTable1739060300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(`
      CREATE TABLE "events" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "calendar_id" uuid NOT NULL,
        "day" character varying(50) NOT NULL,
        "time" character varying(50) NOT NULL,
        "asset_id" uuid NOT NULL,
        "name" character varying(255) NOT NULL,
        "impact" character varying(100) NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_events_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_events_calendar" FOREIGN KEY ("calendar_id") 
          REFERENCES "weekly_calendar"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_events_asset" FOREIGN KEY ("asset_id") 
          REFERENCES "assets"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_events_calendar" ON "events" ("calendar_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_events_asset" ON "events" ("asset_id")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "events"`);
  }
}
