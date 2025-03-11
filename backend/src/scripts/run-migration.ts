import { createConnection } from 'typeorm';
import { UpdateTransactionCategoryRelation1630000000001 } from '../migrations/1630000000001-UpdateTransactionCategoryRelation';
import { config } from 'dotenv';

// Load environment variables
config();

async function runMigration() {
  console.log('Connecting to database...');
  
  // Create a connection with more detailed configuration
  const connection = await createConnection({
    type: 'sqlite', // or your database type
    database: 'database.sqlite', // or your database name
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    synchronize: false // Important: set to false when running migrations
  });
  
  console.log('Connected to database');

  try {
    console.log('Running migration: UpdateTransactionCategoryRelation...');
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