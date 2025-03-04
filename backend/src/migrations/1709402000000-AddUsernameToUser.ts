import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUsernameToUser1709402000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // First, add the username column but make it nullable temporarily
    await queryRunner.query(`
      ALTER TABLE "user" ADD COLUMN "username" TEXT;
    `);

    // Update existing users to have a username based on their email
    await queryRunner.query(`
      UPDATE "user" SET "username" = substr("email", 1, instr("email", '@') - 1) WHERE "username" IS NULL;
    `);

    // Make the username column NOT NULL and UNIQUE
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_username" ON "user" ("username");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX "IDX_username";
    `);
    
    await queryRunner.query(`
      ALTER TABLE "user" DROP COLUMN "username";
    `);
  }
} 