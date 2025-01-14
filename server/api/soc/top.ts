import { db } from '../../../db';
import { socDetailedOccupations, socSectorDistribution } from '../../../db/schema';
import { sql, desc } from 'drizzle-orm';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const sector = url.searchParams.get('sector')?.trim();

    console.log('Fetching top occupations:', { sector, sectorLabel: sector ? `NAICS${sector}` : null });

    if (!sector) {
      return new Response(JSON.stringify({ items: [] }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const sectorLabel = `NAICS${sector}`;
    const results = await db.select({
      code: socDetailedOccupations.code,
      title: socDetailedOccupations.title,
      description: socDetailedOccupations.description,
      sectorDistribution: socSectorDistribution.percentage
    })
    .from(socDetailedOccupations)
    .leftJoin(
      socSectorDistribution,
      sql`${socDetailedOccupations.code} = ${socSectorDistribution.socCode} 
      AND ${socSectorDistribution.sectorLabel} = ${sectorLabel}`
    )
    .orderBy(desc(socSectorDistribution.percentage))
    .limit(10);

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