
import { sql } from 'drizzle-orm';
import { db } from '../../../db';
import { socDetailedOccupations, socSectorDistribution } from '../../../db/schema';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const sector = url.searchParams.get('sector');

    if (!sector) {
      return new Response(JSON.stringify([]), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const topOccupations = await db
      .select({
        code: socDetailedOccupations.code,
        title: socDetailedOccupations.title,
        description: socDetailedOccupations.description,
        alternativeTitles: socDetailedOccupations.alternativeTitles,
        sectorDistribution: sql<number>`
          COALESCE((
            SELECT percentage 
            FROM ${socSectorDistribution} 
            WHERE soc_code = ${socDetailedOccupations.code} 
            AND sector_label = ${sector}
          ), 0)`.as('sector_distribution'),
        topIndustries: sql<any[]>`
          json_agg(
            json_build_object(
              'sector', sector_label,
              'percentage', percentage
            ) 
          ) FILTER (WHERE sector_label IS NOT NULL)`.as('top_industries')
      })
      .from(socDetailedOccupations)
      .innerJoin(
        socSectorDistribution,
        sql`${socDetailedOccupations.code} = ${socSectorDistribution.socCode}`
      )
      .where(sql`${socSectorDistribution.sectorLabel} = ${sector}`)
      .groupBy(socDetailedOccupations.code)
      .orderBy(sql`sector_distribution DESC`)
      .limit(10);

    return new Response(JSON.stringify(topOccupations), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error fetching top occupations:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
