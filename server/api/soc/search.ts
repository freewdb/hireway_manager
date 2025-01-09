import { eq, sql, and, or, desc, ilike } from 'drizzle-orm';
import { db } from '../../../db';
import { socDetailedOccupations, socMajorGroups, socMinorGroups, socSectorDistribution } from '../../../db/schema';
import type { JobTitleSearchResult } from '../../../db/schema';
import Fuse from 'fuse.js';

interface ConsolidatedJobResult {
  code: string;
  primaryTitle: string;
  description: string | undefined;
  alternativeTitles: string[];
  matchedAlternatives: string[];
  isAlternative: boolean;
  rank: number;
  majorGroup?: {
    code: string;
    title: string;
  };
  minorGroup?: {
    code: string;
    title: string;
  };
  topIndustries?: { sector: string; percentage: number }[];
}

interface SearchResponse {
  items: ConsolidatedJobResult[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  query: string;
}

function consolidateResults(items: any[], query: string, sector?: string, showAll?: boolean): ConsolidatedJobResult[] {
  const SECTOR_BOOST_ALPHA = 0.3;
  const SECTOR_FILTER_THRESHOLD = 1.0;

  let filteredItems = items;
  if (!showAll && sector) {
    filteredItems = filteredItems.filter(item => {
      const dist = item.sector_distribution ?? 0;
      return dist >= SECTOR_FILTER_THRESHOLD;
    });
  }

  // Track which codes we've seen to prevent duplicates
  const resultsByCode = new Map<string, ConsolidatedJobResult>();
  const queryLower = query.toLowerCase();

  // Process all items preserving original titles
  for (const item of filteredItems) {
    if (!resultsByCode.has(item.code)) {
      resultsByCode.set(item.code, {
        code: item.code,
        title: item.title, // Always use the original title
        description: item.description,
        alternativeTitles: item.alternativeTitles || [],
        matchedAlternatives: [],
        isAlternative: false,
        rank: 1.0,
        majorGroup: item.majorGroup,
        minorGroup: item.minorGroup,
        topIndustries: item.topIndustries
      });
    }
  }

  // Second pass - add alternative title matches only if not already included
  for (const item of filteredItems) {
    if (resultsByCode.has(item.code)) continue;

    const matchedAlt = (item.alternativeTitles || []).find(alt => 
      alt.toLowerCase().includes(queryLower) || queryLower.includes(alt.toLowerCase())
    );

    if (matchedAlt) {
      resultsByCode.set(item.code, {
        code: item.code,
        primaryTitle: item.title, // Always use official title
        description: item.description,
        alternativeTitles: item.alternativeTitles || [],
        matchedAlternatives: [matchedAlt],
        isAlternative: true,
        rank: 0.9,
        majorGroup: item.majorGroup,
        minorGroup: item.minorGroup,
        topIndustries: item.topIndustries
      });
    }
  }

  items.forEach(item => {
    const titleLower = item.title.toLowerCase();
    const alternativeTitles = item.alternativeTitles || [];

    // Find which alternative title matched (if any)
    const matchedAlternative = alternativeTitles.find(alt => 
      alt.toLowerCase().includes(queryLower) || 
      queryLower.includes(alt.toLowerCase())
    );

    // Calculate rank based on match type
    let rank = 1.0;
    if (matchedAlternative) {
      rank = 0.9; // Slight penalty for alternative match
    }

    // Apply sector boost if sector is provided
    if (sector && item.sector_distribution) {
      const distribution = Math.max(0, Math.min(100, item.sector_distribution));

      // Enhanced sector-based boosting
      if (distribution >= 90) {
        rank *= 2.0; // Double rank for industry specialists
      } else if (distribution >= 75) {
        rank *= 1.75; // Strong boost for very high representation
      } else if (distribution >= 50) {
        rank *= 1.5; // Significant boost for high representation
      } else if (distribution >= 25) {
        rank *= 1.25; // Moderate boost for medium representation
      } else if (distribution >= 10) {
        rank *= 1.1; // Slight boost for low representation
      } else if (distribution < 5) {
        rank *= 0.75; // Penalty for very rare occupations in sector
      }
    }

    if (!resultsByCode.has(item.code)) {
      resultsByCode.set(item.code, {
        code: item.code,
        title: item.title, // Use official title
        description: item.description || undefined,
        alternativeTitles,
        matchedAlternatives: matchedAlternative ? [matchedAlternative] : [],
        isAlternative: !!matchedAlternative,
        rank,
        majorGroup: item.majorGroup?.code ? {
          code: item.majorGroup.code,
          title: item.majorGroup.title
        } : undefined,
        minorGroup: item.minorGroup?.code ? {
          code: item.minorGroup.code,
          title: item.minorGroup.title
        } : undefined,
        topIndustries: item.topIndustries
      });
    } else {
      const existing = resultsByCode.get(item.code)!;
      // Update rank if this match is better
      if (rank > existing.rank) {
        existing.rank = rank;
        existing.matchedAlternatives = matchedAlternative ? [matchedAlternative] : [];
        existing.isAlternative = !!matchedAlternative;
      }

      // Add any new alternative titles
      alternativeTitles.forEach((alt: string) => {
        if (!existing.alternativeTitles.includes(alt)) {
          existing.alternativeTitles.push(alt);
        }
      });
    }
  });

  return Array.from(resultsByCode.values())
    .sort((a, b) => {
      // First sort by rank
      const rankDiff = b.rank - a.rank;
      if (rankDiff !== 0) return rankDiff;

      // Then by whether it's a primary title match
      if (!a.isAlternative && b.isAlternative) return -1;
      if (a.isAlternative && !b.isAlternative) return 1;

      // Then by number of matched alternatives
      return b.matchedAlternatives.length - a.matchedAlternatives.length;
    });
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const query = url.searchParams.get('search')?.trim() || '';
    const sector = url.searchParams.get('sector')?.trim();
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get('limit') || '20', 10)));
    const offset = (page - 1) * limit;

    console.log('Search request received:', {
      searchTerm: query,
      page,
      limit,
      offset,
      queryParams: Object.fromEntries(url.searchParams),
      path: url.pathname
    });

    // If no query, return browsable categories
    if (!query || query.length < 2) {
      const majorGroups = await db
        .select({
          code: socMajorGroups.code,
          title: socMajorGroups.title,
          description: socMajorGroups.description,
          minorGroups: sql<any>`
            json_agg(
              json_build_object(
                'code', ${socMinorGroups.code},
                'title', ${socMinorGroups.title},
                'description', ${socMinorGroups.description}
              )
            )`
        })
        .from(socMajorGroups)
        .leftJoin(socMinorGroups, eq(socMajorGroups.code, socMinorGroups.majorGroupCode))
        .groupBy(socMajorGroups.code, socMajorGroups.title, socMajorGroups.description)
        .orderBy(socMajorGroups.code);

      return new Response(JSON.stringify({
        items: majorGroups,
        totalCount: majorGroups.length,
        currentPage: 1,
        totalPages: 1,
        query: ''
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // First try exact match with title and alternative titles
    console.log('Attempting exact match search for:', query);
    const exactMatches = await db
      .select({
        code: socDetailedOccupations.code,
        title: socDetailedOccupations.title,
        description: socDetailedOccupations.description,
        alternativeTitles: socDetailedOccupations.alternativeTitles,
        searchableText: socDetailedOccupations.searchableText,
        topIndustries: sql<any[]>`
          SELECT json_agg(
            json_build_object(
              'sector', sector_label,
              'percentage', percentage
            )
          )
          FROM (
            SELECT sector_label, percentage 
            FROM ${socSectorDistribution}
            WHERE soc_code = ${socDetailedOccupations.code}
            ORDER BY percentage DESC 
            LIMIT 3
          ) top`.as('top_industries'),
        sectorDistribution: sql<number>`
          COALESCE(
            (
              SELECT percentage 
              FROM ${socSectorDistribution} 
              WHERE soc_code = ${socDetailedOccupations.code} 
              AND (
                CASE 
                  WHEN ${sector} = '21' THEN sector_label = 'Mining'
                  WHEN ${sector} = '31-33' THEN sector_label = 'Manufacturing'
                  WHEN ${sector} = '44-45' THEN sector_label = 'Retail Trade'
                  WHEN ${sector} = '48-49' THEN sector_label = 'Transportation and Warehousing'
                  ELSE sector_label = ${sector}
                END
              )
              LIMIT 1
            ),
            0
          )`.as('sector_distribution'),
        debug_distribution: sql`
          SELECT json_build_object(
            'soc_code', ${socDetailedOccupations.code},
            'sector', ${sector},
            'distribution', (
              SELECT percentage 
              FROM ${socSectorDistribution} 
              WHERE soc_code = ${socDetailedOccupations.code} 
              AND (sector_label = ${sector} OR 
                   (${sector} = '21' AND sector_label = 'Mining, Quarrying, and Oil and Gas Extraction'))
            )
          )
        `.as('debug_distribution'),
        majorGroup: {
          code: socMajorGroups.code,
          title: socMajorGroups.title,
          description: socMajorGroups.description,
        },
        minorGroup: {
          code: socMinorGroups.code,
          title: socMinorGroups.title,
          description: socMinorGroups.description,
        }
      })
      .from(socDetailedOccupations)
      .leftJoin(
        socMinorGroups,
        eq(socDetailedOccupations.minorGroupCode, socMinorGroups.code)
      )
      .leftJoin(
        socMajorGroups,
        eq(socMinorGroups.majorGroupCode, socMajorGroups.code)
      )
      .where(
        or(
          ilike(socDetailedOccupations.title, `%${query}%`),
          sql`${socDetailedOccupations.alternativeTitles}::text[] && ARRAY[${query}]::text[]`,
          sql`to_tsvector('english', ${socDetailedOccupations.searchableText}) @@ plainto_tsquery('english', ${query})`
        )
      )
      .limit(100);

    if (exactMatches.length >= 5) {
      const results = consolidateResults(exactMatches, query);

      // Check for duplicates
      const codeFrequency = results.reduce((acc, curr) => {
        acc[curr.code] = (acc[curr.code] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const duplicates = Object.entries(codeFrequency)
        .filter(([_, count]) => count > 1)
        .map(([code, count]) => ({
          code,
          count,
          titles: results.filter(r => r.code === code).map(r => r.primaryTitle)
        }));

      console.log('Results analysis:', {
        count: results.length,
        uniqueCodes: Object.keys(codeFrequency).length,
        duplicates: duplicates.length ? duplicates : 'None',
        firstResult: results[0]
      });

      const response: SearchResponse = {
        items: results.slice(offset, offset + limit),
        totalCount: results.length,
        currentPage: page,
        totalPages: Math.ceil(results.length / limit),
        query
      };

      console.log('Returning exact match results:', {
        totalCount: results.length,
        returnedCount: response.items.length,
        page,
        totalPages: response.totalPages
      });

      return new Response(JSON.stringify(response), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // If not enough exact matches, try fuzzy search
    console.log('Few or no exact matches, trying fuzzy search...');

    const potentialMatches = await db
      .select({
        code: socDetailedOccupations.code,
        title: socDetailedOccupations.title,
        description: socDetailedOccupations.description,
        alternativeTitles: socDetailedOccupations.alternativeTitles,
        searchableText: socDetailedOccupations.searchableText,
        majorGroup: {
          code: socMajorGroups.code,
          title: socMajorGroups.title,
          description: socMajorGroups.description,
        },
        minorGroup: {
          code: socMinorGroups.code,
          title: socMinorGroups.title,
          description: socMinorGroups.description,
        }
      })
      .from(socDetailedOccupations)
      .leftJoin(
        socMinorGroups,
        eq(socDetailedOccupations.minorGroupCode, socMinorGroups.code)
      )
      .leftJoin(
        socMajorGroups,
        eq(socMinorGroups.majorGroupCode, socMajorGroups.code)
      )
      .where(
        sql`similarity(${socDetailedOccupations.searchableText}, ${query}) > 0.1`
      )
      .orderBy(sql`similarity(${socDetailedOccupations.searchableText}, ${query}) DESC`)
      .limit(100);

    const fuse = new Fuse(potentialMatches, {
      keys: [
        { name: 'title', weight: 1 },
        { name: 'alternativeTitles', weight: 0.9 },
        { name: 'description', weight: 0.7 }
      ],
      includeScore: true,
      threshold: query.length <= 3 ? 0.3 : 0.5,
      ignoreLocation: true,
      useExtendedSearch: true
    });

    const fuseResults = fuse.search(query);
    const results = consolidateResults(fuseResults.map(r => r.item), query);

    // Check for duplicates
    const codeFrequency = results.reduce((acc, curr) => {
      acc[curr.code] = (acc[curr.code] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const duplicates = Object.entries(codeFrequency)
      .filter(([_, count]) => count > 1)
      .map(([code, count]) => ({
        code,
        count,
        titles: results.filter(r => r.code === code).map(r => r.primaryTitle)
      }));

    console.log('Results analysis:', {
      count: results.length,
      uniqueCodes: Object.keys(codeFrequency).length,
      duplicates: duplicates.length ? duplicates : 'None',
      firstResult: results[0]
    });

    const response: SearchResponse = {
      items: results.slice(offset, offset + limit),
      totalCount: results.length,
      currentPage: page,
      totalPages: Math.ceil(results.length / limit),
      query
    };

    console.log('Returning fuzzy search results:', {
      totalCount: results.length,
      returnedCount: response.items.length,
      page,
      totalPages: response.totalPages
    });

    return new Response(JSON.stringify(response), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error in job title search:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}