import { createConnection } from 'typeorm';
import { UpdateTransactionCategoryRelation1630000000001 } from '../migrations/1630000000001-UpdateTransactionCategoryRelation';

async function runMigration() {
  console.log('Connecting to database...');
  const connection = await createConnection();
  console.log('Connected to database');

  try {
    console.log('Running migration...');
    const migration = new UpdateTransactionCategoryRelation1630000000001();
    await migration.up(connection.createQueryRunner());
    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Error running migration:', error);
  } finally {
    await connection.close();
    console.log('Database connection closed');
  }
}

runMigration()
  .then(() => console.log('Done'))
  .catch(error => console.error('Script failed:', error)); 