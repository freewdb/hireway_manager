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
      console.log('Search term:', searchTerm); // Debug log

      if (!searchTerm || searchTerm.length < 2) {
        return res.json([]);
      }

      // Step 1: Initial PostgreSQL search using ts_vector
      const searchTerms = searchTerm
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map(term => term.replace(/[^\w\s]/g, ''))
        .join(' | ');

      console.log('Processed search terms:', searchTerms); // Debug log

      const dbResults = await db.select({
        code: socDetailedOccupations.code,
        title: socDetailedOccupations.title,
        description: socDetailedOccupations.description,
        alternativeTitles: socDetailedOccupations.alternativeTitles,
        minorGroupCode: socDetailedOccupations.minorGroupCode,
        searchVector: socDetailedOccupations.searchVector,
        rank: sql<number>`ts_rank_cd(search_vector, plainto_tsquery('english', ${searchTerms}))`
      })
      .from(socDetailedOccupations)
      .where(sql`search_vector @@ plainto_tsquery('english', ${searchTerms})`)
      .orderBy(sql`ts_rank_cd(search_vector, plainto_tsquery('english', ${searchTerms})) DESC`)
      .limit(100);

      console.log('Initial DB results count:', dbResults.length); // Debug log

      if (!dbResults.length) {
        return res.json([]);
      }

      // Step 2: Get related group information
      const minorGroupCodes = Array.from(new Set(dbResults.map(r => r.minorGroupCode)));
      const relatedMinorGroups = await db.select()
        .from(socMinorGroups)
        .where(sql`code = ANY(${minorGroupCodes})`);

      const majorGroupCodes = Array.from(new Set(relatedMinorGroups.map(r => r.majorGroupCode)));
      const relatedMajorGroups = await db.select()
        .from(socMajorGroups)
        .where(sql`code = ANY(${majorGroupCodes})`);

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

        if (result.alternativeTitles?.length) {
          items.push(...result.alternativeTitles.map(altTitle => ({
            code: result.code,
            title: altTitle,
            isAlternative: true,
            rank: result.rank * 0.9,
            description: result.description || undefined,
            majorGroup: items[0].majorGroup,
            minorGroup: items[0].minorGroup
          })));
        }

        return items;
      });

      console.log('Total searchable items:', searchItems.length); // Debug log

      // Step 4: Apply fuzzy search
      const fuse = new Fuse(searchItems, {
        keys: ['title'],
        includeScore: true,
        threshold: 0.6,
        distance: 200,
        minMatchCharLength: 2
      });

      const fuseResults = fuse.search(searchTerm);
      console.log('Fuzzy search results count:', fuseResults.length); // Debug log

      const finalResults = fuseResults
        .map(result => ({
          ...result.item,
          rank: result.item.rank * (1 - (result.score || 0))
        }))
        .sort((a, b) => b.rank - a.rank)
        .slice(0, 20);

      console.log('Final results count:', finalResults.length); // Debug log

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