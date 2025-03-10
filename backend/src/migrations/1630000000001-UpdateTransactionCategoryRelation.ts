import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateTransactionCategoryRelation1630000000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // First, make sure the categoryId column exists
    await queryRunner.query(`
      ALTER TABLE transactions 
      ADD COLUMN IF NOT EXISTS categoryId INTEGER
    `);

    // Now uncomment the line to drop the category column
    // This will force the application to use the categoryId relation
    await queryRunner.query(`
      ALTER TABLE transactions DROP COLUMN category
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Add back the category column
    await queryRunner.query(`
      ALTER TABLE transactions 
      ADD COLUMN IF NOT EXISTS category TEXT
    `);
  }
} 