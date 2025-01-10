
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';

async function verifySOCCodes() {
  try {
    console.log('Running detailed diagnostics...');
    
    // Check DATABASE_URL
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is not set');
    }
    console.log('Database URL is set');

    // Create postgres client with more explicit error handling
    const client = postgres(process.env.DATABASE_URL, { 
      max: 1,
      timeout: 5,
      debug: console.log
    });
    
    // Initialize drizzle
    const db = drizzle(client);
    console.log('Database client initialized');

    // Test connection
    const testResult = await client.query('SELECT current_database(), current_schema();');
    console.log('Connection test result:', testResult);
    
    // Check sector distribution
    const distributionCheck = await client.query(`
      SELECT * FROM soc_sector_distribution 
      WHERE soc_code = '47-5041.00' 
      AND sector_label = 'NAICS21';
    `);
    console.log('Distribution check:', distributionCheck);

    // Check occupation
    const occupationCheck = await client.query(`
      SELECT code, title FROM soc_detailed_occupations 
      WHERE code = '47-5041.00';
    `);
    console.log('Occupation check:', occupationCheck);

  } catch (error) {
    console.error('Error during verification:', error);
  }
}

verifySOCCodes()
  .catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  })
  .finally(() => {
    console.log('Verification complete');
    process.exit(0);
  });
