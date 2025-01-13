
import { sql } from 'drizzle-orm';
import { db } from '../../../db';
import { socDetailedOccupations, socSectorDistribution } from '../../../db/schema';

export async function GET(req: Request) {
  try {
    console.log('Received request to /api/soc/top');
    const url = new URL(req.url);
    const sector = url.searchParams.get('sector');

    if (!sector) {
      console.log('No sector provided to /api/soc/top');
      return new Response(JSON.stringify({ error: 'Sector parameter is required' }), {
        headers: { 'Content-Type': 'application/json' },
        status: 400
      });
    }

    const sectorLabel = sql`
      CASE 
        WHEN ${sector} = '31_33' THEN 'NAICS31_33'
        WHEN ${sector} = '44_45' THEN 'NAICS44_45'
        WHEN ${sector} = '48_49' THEN 'NAICS48_49'
        ELSE 'NAICS' || LPAD(${sector}, 2, '0')
      END
    `;
    console.log('Fetching top occupations for sector:', {
      rawSector: sector,
      formattedLabel: sectorLabel.sql,
      sectorLabelParams: sectorLabel.params,
      timestamp: new Date().toISOString()
    });

    // Debug sector distribution query
    const distributionQuery = sql`
      SELECT soc_code, sector_label, percentage 
      FROM ${socSectorDistribution}
      WHERE sector_label = ${sectorLabel}
      ORDER BY percentage DESC
      LIMIT 5
    `;

    console.log('Executing distribution query:', {
      sql: distributionQuery.sql,
      params: distributionQuery.params
    });

    const sampleDistribution = await db.execute(distributionQuery);
    console.log('Sample sector distribution:', {
      results: sampleDistribution.rows,
      count: sampleDistribution.rows.length
    });
    
    // Debug query
    const debugQuery = await db
      .select({
        count: sql`count(*)`,
        sample: sql`json_agg(json_build_object(
          'soc_code', ${socDetailedOccupations.code},
          'sector_label', sector_label,
          'percentage', percentage
        ) ORDER BY percentage DESC LIMIT 3)`
      })
      .from(socSectorDistribution)
      .where(sql`sector_label = ${sectorLabel}`);
    
    console.log('Debug query results:', debugQuery[0]);

    const topOccupations = await db
      .select({
        code: socDetailedOccupations.code,
        title: socDetailedOccupations.title,
        description: socDetailedOccupations.description,
        alternativeTitles: socDetailedOccupations.alternativeTitles,
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

    console.log('Top occupations query returned:', topOccupations.length, 'results');
    if (topOccupations.length === 0) {
      console.log('No results found for sector:', sectorLabel);
    }

    return new Response(JSON.stringify(topOccupations), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error in /api/soc/top:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
