import { MigrationInterface, QueryRunner, TableUnique } from 'typeorm';

export class AddBudgetUniqueConstraint1709123456789 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // First remove any duplicates, keeping the most recent
    await queryRunner.query(`
      WITH ranked_budgets AS (
        SELECT id,
               ROW_NUMBER() OVER (
                 PARTITION BY "userId", "categoryId", "startDate", "endDate"
                 ORDER BY "createdAt" DESC
               ) as rn
        FROM budgets
      )
      DELETE FROM budgets
      WHERE id IN (
        SELECT id FROM ranked_budgets WHERE rn > 1
      );
    `);

    // Add unique constraint
    await queryRunner.createUniqueConstraint(
      'budgets',
      new TableUnique({
        name: 'UQ_budget_user_category_period',
        columnNames: ['userId', 'categoryId', 'startDate', 'endDate'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropUniqueConstraint(
      'budgets',
      'UQ_budget_user_category_period'
    );
  }
} 