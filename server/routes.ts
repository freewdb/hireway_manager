import type { Express } from "express";
import { createServer, type Server } from "http";
import { db } from "@db";
import { socDetailedOccupations, socMajorGroups, socMinorGroups } from "@db/schema";
import { sql } from "drizzle-orm";
import Fuse from 'fuse.js';

export function registerRoutes(app: Express): Server {
  app.get("/api/job-titles", async (req, res) => {
    try {
      const searchTerm = req.query.search as string | undefined;

      if (!searchTerm || searchTerm.length < 2) {
        return res.json([]);
      }

      // Step 1: Initial PostgreSQL search using ts_vector
      const processedSearch = searchTerm
        .toLowerCase()
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map(term => term + ':*') // Add prefix matching
        .join(' & ');  // Use AND operator for multiple terms

      const dbResults = await db.select({
        code: socDetailedOccupations.code,
        title: socDetailedOccupations.title,
        description: socDetailedOccupations.description,
        alternativeTitles: socDetailedOccupations.alternativeTitles,
        minorGroupCode: socDetailedOccupations.minorGroupCode,
        searchableText: socDetailedOccupations.searchableText,
        rank: sql<number>`ts_rank_cd(${socDetailedOccupations.searchVector}, to_tsquery('english', ${processedSearch}))`
      })
      .from(socDetailedOccupations)
      .where(sql`${socDetailedOccupations.searchVector} @@ to_tsquery('english', ${processedSearch})`)
      .orderBy(sql`ts_rank_cd(${socDetailedOccupations.searchVector}, to_tsquery('english', ${processedSearch})) DESC`)
      .limit(100);

      if (!dbResults.length) {
        // Fallback to more lenient search if no exact matches
        const fallbackResults = await db.select({
          code: socDetailedOccupations.code,
          title: socDetailedOccupations.title,
          description: socDetailedOccupations.description,
          alternativeTitles: socDetailedOccupations.alternativeTitles,
          minorGroupCode: socDetailedOccupations.minorGroupCode,
          searchableText: socDetailedOccupations.searchableText,
          rank: sql<number>`1`
        })
        .from(socDetailedOccupations)
        .where(sql`${socDetailedOccupations.searchableText} ILIKE ${`%${searchTerm}%`}`)
        .limit(100);

        dbResults.push(...fallbackResults);
      }

      if (!dbResults.length) {
        return res.json([]);
      }

      // Step 2: Get related group information
      const minorGroupCodes = Array.from(new Set(dbResults.map(r => r.minorGroupCode)));
      const relatedMinorGroups = await db.select()
        .from(socMinorGroups)
        .where(sql`${socMinorGroups.code} = ANY(${minorGroupCodes})`);

      const majorGroupCodes = Array.from(new Set(relatedMinorGroups.map(r => r.majorGroupCode)));
      const relatedMajorGroups = await db.select()
        .from(socMajorGroups)
        .where(sql`${socMajorGroups.code} = ANY(${majorGroupCodes})`);

      // Step 3: Create searchable items including alternative titles
      const searchItems = dbResults.flatMap(result => {
        const items = [{
          code: result.code,
          title: result.title,
          isAlternative: false,
          rank: result.rank,
          description: result.description || undefined,
          majorGroup: relatedMajorGroups.find(mg => 
            relatedMinorGroups.some(rg => 
              rg.majorGroupCode === mg.code && rg.code === result.minorGroupCode
            )
          ),
          minorGroup: relatedMinorGroups.find(mg => mg.code === result.minorGroupCode)
        }];

        // Add alternative titles as separate results with slightly lower rank
        if (result.alternativeTitles?.length) {
          items.push(...result.alternativeTitles.map(altTitle => ({
            code: result.code,
            title: altTitle,
            isAlternative: true,
            rank: result.rank * 0.9, // Slightly lower rank for alternative titles
            description: result.description || undefined,
            majorGroup: items[0].majorGroup,
            minorGroup: items[0].minorGroup
          })));
        }

        return items;
      });

      // Step 4: Apply fuzzy search for final ranking
      const fuse = new Fuse(searchItems, {
        keys: ['title'],
        includeScore: true,
        threshold: 0.6,
        minMatchCharLength: 2
      });

      const fuseResults = fuse.search(searchTerm);

      // Combine database ranking with fuzzy search score
      const finalResults = fuseResults
        .map(result => ({
          ...result.item,
          rank: result.item.rank * (1 - (result.score || 0))
        }))
        .sort((a, b) => b.rank - a.rank)
        .slice(0, 20);

      res.json(finalResults);
    } catch (error) {
      console.error('Error in job titles search:', error);
      res.status(500).json({ 
        error: "Failed to search job titles",
        details: process.env.NODE_ENV === 'development' ? String(error) : undefined
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}