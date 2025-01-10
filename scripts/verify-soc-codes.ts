
import { db } from '../db';
import { sql } from 'drizzle-orm';

async function verifySOCCodes() {
  try {
    console.log('Running detailed diagnostics...');
    
    // Test database connection first
    try {
      if (!process.env.DATABASE_URL) {
        throw new Error('DATABASE_URL environment variable is not set');
      }

      const dbTest = await db.execute(sql`SELECT current_database(), current_schema()`);
      if (!dbTest?.rows?.length) {
        throw new Error('Database query returned no results');
      }
      console.log('Database connection successful:', {
        database: dbTest.rows[0].current_database,
        schema: dbTest.rows[0].current_schema
      });
    } catch (err) {
      console.error('Database connection error:', err);
      return;
    }
    
    // Check exact row in sector distribution
    const distributionCheck = await db.execute(sql`
      SELECT * FROM soc_sector_distribution 
      WHERE soc_code = '47-5041.00' 
      AND sector_label = 'NAICS21';
    `);
    console.log('Distribution check:', distributionCheck?.rows || []);

    // Check if code exists in occupations table
    const occupationCheck = await db.execute(sql`
      SELECT code, title FROM soc_detailed_occupations 
      WHERE code = '47-5041.00';
    `);
    console.log('Occupation check:', occupationCheck?.rows || []);

    // Check all sector distributions for this occupation
    const allDistributions = await db.execute(sql`
      SELECT soc_code, sector_label, percentage 
      FROM soc_sector_distribution 
      WHERE soc_code = '47-5041.00'
      ORDER BY percentage DESC;
    `);
    console.log('All distributions:', allDistributions?.rows || []);

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
