
import { db } from '../db';
import { sql } from 'drizzle-orm';

async function verifySOCCodes() {
  try {
    console.log('Running detailed diagnostics...');
    
    // Test database connection first
    try {
      const dbTest = await db.execute(sql`SELECT current_database();`);
      console.log('Connected to database:', dbTest.rows[0]?.current_database);
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
    console.log('Distribution check:', distributionCheck.rows);

    // Check if code exists in occupations table
    const occupationCheck = await db.execute(sql`
      SELECT code, title FROM soc_detailed_occupations 
      WHERE code = '47-5041.00';
    `);
    console.log('Occupation check:', occupationCheck.rows);

    // Check all sector distributions for this occupation
    const allDistributions = await db.execute(sql`
      SELECT soc_code, sector_label, percentage 
      FROM soc_sector_distribution 
      WHERE soc_code = '47-5041.00'
      ORDER BY percentage DESC;
    `);
    console.log('All distributions:', allDistributions.rows);

  } catch (error) {
    console.error('Error during verification:', error);
    process.exit(1);
  }
}

// Execute and handle any errors
verifySOCCodes()
  .catch(console.error)
  .finally(() => {
    console.log('Verification complete');
    process.exit(0);
  });
