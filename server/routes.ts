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
      console.log('Search request:', { searchTerm }); // Debug log

      if (!searchTerm || searchTerm.length < 2) {
        return res.json([]);
      }

      // Simple text search first
      const dbResults = await db.select({
        code: socDetailedOccupations.code,
        title: socDetailedOccupations.title,
        description: socDetailedOccupations.description,
        alternativeTitles: socDetailedOccupations.alternativeTitles,
        minorGroupCode: socDetailedOccupations.minorGroupCode,
        searchableText: socDetailedOccupations.searchableText,
      })
      .from(socDetailedOccupations)
      .where(sql`${socDetailedOccupations.searchableText} ILIKE ${`%${searchTerm}%`}`)
      .limit(100);

      console.log('Initial results:', { count: dbResults.length }); // Debug log

      // If no results, try searching individual words
      if (!dbResults.length) {
        const words = searchTerm.toLowerCase().split(/\s+/).filter(Boolean);
        const conditions = words.map(word => 
          sql`${socDetailedOccupations.searchableText} ILIKE ${`%${word}%`}`
        );

        const results = await db.select({
          code: socDetailedOccupations.code,
          title: socDetailedOccupations.title,
          description: socDetailedOccupations.description,
          alternativeTitles: socDetailedOccupations.alternativeTitles,
          minorGroupCode: socDetailedOccupations.minorGroupCode,
          searchableText: socDetailedOccupations.searchableText,
        })
        .from(socDetailedOccupations)
        .where(sql`(${sql.join(conditions, sql` OR `)})`)
        .limit(100);

        dbResults.push(...results);
        console.log('After word search:', { count: dbResults.length }); // Debug log
      }

      if (!dbResults.length) {
        return res.json([]);
      }

      // Get related group information
      const minorGroupCodes = Array.from(new Set(dbResults.map(r => r.minorGroupCode)));
      const relatedMinorGroups = await db.select()
        .from(socMinorGroups)
        .where(sql`${socMinorGroups.code} = ANY(${minorGroupCodes})`);

      const majorGroupCodes = Array.from(new Set(relatedMinorGroups.map(r => r.majorGroupCode)));
      const relatedMajorGroups = await db.select()
        .from(socMajorGroups)
        .where(sql`${socMajorGroups.code} = ANY(${majorGroupCodes})`);

      // Create searchable items including alternative titles
      const searchItems = dbResults.flatMap(result => {
        // Main title
        const items = [{
          code: result.code,
          title: result.title,
          isAlternative: false,
          rank: 1,
          description: result.description || undefined,
          majorGroup: relatedMajorGroups.find(mg => 
            relatedMinorGroups.some(rg => 
              rg.majorGroupCode === mg.code && rg.code === result.minorGroupCode
            )
          ),
          minorGroup: relatedMinorGroups.find(mg => mg.code === result.minorGroupCode)
        }];

        // Alternative titles
        if (result.alternativeTitles?.length) {
          items.push(...result.alternativeTitles.map(altTitle => ({
            code: result.code,
            title: altTitle,
            isAlternative: true,
            rank: 0.9,
            description: result.description || undefined,
            majorGroup: items[0].majorGroup,
            minorGroup: items[0].minorGroup
          })));
        }

        return items;
      });

      console.log('Before fuzzy search:', { count: searchItems.length }); // Debug log

      // Apply fuzzy search for final ranking
      const fuse = new Fuse(searchItems, {
        keys: ['title'],
        includeScore: true,
        threshold: 0.6,
        minMatchCharLength: 2
      });

      const fuseResults = fuse.search(searchTerm);
      console.log('After fuzzy search:', { count: fuseResults.length }); // Debug log

      // Sort by relevance and limit results
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