import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateBudgetCategoryRelation1630000000002 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // First, add the categoryId column
    await queryRunner.query(`
      ALTER TABLE budgets 
      ADD COLUMN categoryId INTEGER
    `);

    // Create the foreign key constraint
    await queryRunner.query(`
      ALTER TABLE budgets
      ADD CONSTRAINT FK_budget_category
      FOREIGN KEY (categoryId) REFERENCES categories(id)
    `);

    // Copy existing category names to link with category IDs
    await queryRunner.query(`
      UPDATE budgets b
      SET categoryId = (
        SELECT c.id 
        FROM categories c 
        WHERE c.name = b.category
        LIMIT 1
      )
    `);

    // Finally, drop the category column
    await queryRunner.query(`
      ALTER TABLE budgets 
      DROP COLUMN category
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Add back the category column
    await queryRunner.query(`
      ALTER TABLE budgets 
      ADD COLUMN category TEXT
    `);

    // Copy category names back
    await queryRunner.query(`
      UPDATE budgets b
      SET category = (
        SELECT c.name
        FROM categories c
        WHERE c.id = b.categoryId
      )
    `);

    // Drop the foreign key constraint
    await queryRunner.query(`
      ALTER TABLE budgets
      DROP CONSTRAINT FK_budget_category
    `);

    // Drop the categoryId column
    await queryRunner.query(`
      ALTER TABLE budgets
      DROP COLUMN categoryId
    `);
  }
} 