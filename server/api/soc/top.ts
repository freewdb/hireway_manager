import { db } from '../../../db';
import { socDetailedOccupations, socSectorDistribution } from '../../../db/schema';
import { sql, desc, and, eq } from 'drizzle-orm';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url, 'http://dummy.com');
    const sector = url.searchParams.get('sector')?.trim();
    const sectorLabel = sector ? `NAICS${sector}` : null;

    console.log('Fetching top occupations:', { sector, sectorLabel });

    if (!sectorLabel) {
      return new Response(JSON.stringify({ items: [] }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const results = await db
      .select({
        code: socDetailedOccupations.code,
        title: socDetailedOccupations.title,
        description: socDetailedOccupations.description,
        sectorDistribution: socSectorDistribution.percentage
      })
      .from(socSectorDistribution)
      .innerJoin(
        socDetailedOccupations,
        eq(socDetailedOccupations.code, socSectorDistribution.socCode)
      )
      .where(eq(socSectorDistribution.sectorLabel, sectorLabel))
      .orderBy(desc(socSectorDistribution.percentage))
      .limit(10);

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