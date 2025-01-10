
import { db } from '../db';
import { sql } from 'drizzle-orm';
import { socDetailedOccupations, socSectorDistribution } from '../db/schema';

async function verifySOCCodes() {
  console.log('Checking SOC code "47-5041.00" in both tables...');
  
  const occupation = await db.select()
    .from(socDetailedOccupations)
    .where(sql`${socDetailedOccupations.code} = '47-5041.00'`)
    .limit(1);

  const distribution = await db.select()
    .from(socSectorDistribution)
    .where(sql`${socSectorDistribution.socCode} = '47-5041.00' AND ${socSectorDistribution.sectorLabel} = 'NAICS21'`)
    .limit(1);

  console.log('Detailed Occupation:', occupation);
  console.log('Sector Distribution:', distribution);
}

verifySOCCodes().catch(console.error);
