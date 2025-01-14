import { db } from '../../../db';
import { socDetailedOccupations, socSectorDistribution } from '../../../db/schema';
import { sql, desc } from 'drizzle-orm';

export async function GET(req: Request) {
  try {
    // Get sector directly from request URL
    const sector = new URLSearchParams(req.url.split('?')[1]).get('sector')?.trim();

    console.log('Fetching top occupations:', { sector, sectorLabel: sector ? `NAICS${sector}` : null });

    if (!sector) {
      return new Response(JSON.stringify({ items: [] }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const sectorLabel = `NAICS${sector}`;
    console.log('Executing top occupations query with:', {
      sector,
      sectorLabel
    });
    
    console.log('Using sector label:', sectorLabel);
    
    // First check if we have any sector distribution data at all
    const sectorCheck = await db
      .select({
        count: sql`count(*)`.mapWith(Number)
      })
      .from(socSectorDistribution)
      .where(sql`sector_label = ${sectorLabel}`);
    
    console.log('Sector distribution records for', sectorLabel, ':', sectorCheck[0].count);

    // Get sample records to verify data
    const sectorSample = await db
      .select()
      .from(socSectorDistribution)
      .where(sql`sector_label = ${sectorLabel}`)
      .limit(5);
      
    console.log('Sample sector distribution records:', sectorSample);
    
    const results = await db.select({
      code: socDetailedOccupations.code,
      title: socDetailedOccupations.title,
      description: socDetailedOccupations.description,
      sectorDistribution: socSectorDistribution.percentage,
      socCode: socSectorDistribution.socCode,
      sectorLabel: socSectorDistribution.sectorLabel
    })
    .from(socDetailedOccupations)
    .leftJoin(
      socSectorDistribution,
      sql`${socDetailedOccupations.code} = ${socSectorDistribution.socCode} 
      AND ${socSectorDistribution.sectorLabel} = ${sectorLabel}`
    )
    .orderBy(desc(socSectorDistribution.percentage))
    .limit(10);

    console.log('Sample result record:', results[0]);

    console.log('Top occupations found:', { count: results.length, first: results[0], sector: sectorLabel });

    return new Response(JSON.stringify({ items: results }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error in top occupations:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      items: []
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}