import { db } from '../../../db';
import { socDetailedOccupations, socSectorDistribution } from '../../../db/schema';
import { sql, desc } from 'drizzle-orm';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const sector = url.searchParams.get('sector')?.trim();

    if (!sector) {
      return new Response(JSON.stringify([]), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const sectorLabel = `NAICS${sector}`;
    const results = await db.select()
      .from(socDetailedOccupations)
      .leftJoin(
        socSectorDistribution,
        sql`${socDetailedOccupations.code} = ${socSectorDistribution.socCode} 
        AND ${socSectorDistribution.sectorLabel} = ${sectorLabel}`
      )
      .orderBy(desc(socSectorDistribution.percentage))
      .limit(10);

    return new Response(JSON.stringify(results), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}