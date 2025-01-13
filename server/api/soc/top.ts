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

    const sectorLabel = sql`
      CASE 
        WHEN ${sector} = '31_33' THEN 'NAICS31_33'
        WHEN ${sector} = '44_45' THEN 'NAICS44_45'
        WHEN ${sector} = '48_49' THEN 'NAICS48_49'
        ELSE 'NAICS' || ${sector}
      END
    `;

    const topOccupations = await db
      .select({
        code: socDetailedOccupations.code,
        title: socDetailedOccupations.title,
        description: socDetailedOccupations.description,
        distribution: sql<number>`
          COALESCE((
            SELECT percentage 
            FROM ${socSectorDistribution} 
            WHERE soc_code = ${socDetailedOccupations.code}
            AND sector_label = ${sectorLabel}
          ), 0)`.as('sector_distribution')
      })
      .from(socDetailedOccupations)
      .innerJoin(
        socSectorDistribution,
        sql`${socSectorDistribution.socCode} = ${socDetailedOccupations.code} 
            AND ${socSectorDistribution.sectorLabel} = ${sectorLabel}
            AND ${socSectorDistribution.percentage} > 1.0`
      )
      .orderBy(sql`sector_distribution DESC`)
      .limit(10);

    return new Response(JSON.stringify(topOccupations || []), {
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store'
      }
    });
  } catch (error) {
    console.error('Error in /api/soc/top:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store'
      }
    });
  }
}