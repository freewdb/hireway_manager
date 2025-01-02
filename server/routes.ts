import type { Express } from "express";
import { createServer, type Server } from "http";
import { db } from "@db";
import { socDetailedOccupations } from "@db/schema";
import { sql } from "drizzle-orm";

interface JobTitleSearchResult {
  code: string;
  title: string;
  isAlternative: boolean;
  rank: number;
}

export function registerRoutes(app: Express): Server {
  // Get SOC hierarchy with search capability
  app.get("/api/soc-hierarchy", async (req, res) => {
    try {
      const searchTerm = req.query.search as string | undefined;

      // Get base data
      const majorGroups = await db.select().from(socMajorGroups);
      const minorGroups = await db.select().from(socMinorGroups);

      // If searching, filter occupations based on title or alternative titles
      let occupations;
      if (searchTerm) {
        occupations = await db.select()
          .from(socDetailedOccupations)
          .where(
            ilike(socDetailedOccupations.title, `%${searchTerm}%`)
          );
      } else {
        occupations = await db.select().from(socDetailedOccupations);
      }

      // Build the hierarchy
      const hierarchy = majorGroups.map(major => ({
        ...major,
        minorGroups: minorGroups
          .filter(minor => minor.majorGroupCode === major.code)
          .map(minor => ({
            ...minor,
            occupations: occupations.filter(occ => occ.minorGroupCode === minor.code)
          }))
      }));

      res.json({ majorGroups: hierarchy });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch SOC hierarchy" });
    }
  });

  // Enhanced job titles search endpoint with fuzzy matching
  app.get("/api/job-titles", async (req, res) => {
    try {
      const searchTerm = req.query.search as string | undefined;

      if (!searchTerm || searchTerm.length < 2) {
        return res.json([]);
      }

      // Convert search term to tsquery format
      const searchQuery = searchTerm
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map(term => `${term}:*`) // Add prefix matching
        .join(' & ');

      const results = await db.execute<JobTitleSearchResult>(sql`
        WITH search_results AS (
          SELECT
            code,
            title,
            alternative_titles,
            ts_rank_cd(search_vector, websearch_to_tsquery('english', ${searchQuery})) as rank
          FROM soc_detailed_occupations
          WHERE search_vector @@ websearch_to_tsquery('english', ${searchQuery})
        )
        SELECT 
          code,
          title,
          false as "isAlternative",
          rank
        FROM search_results
        WHERE rank > 0.01
        UNION ALL
        SELECT
          sr.code,
          alt.alt_title as title,
          true as "isAlternative",
          sr.rank * 0.8 as rank
        FROM search_results sr
        CROSS JOIN LATERAL unnest(sr.alternative_titles) as alt(alt_title)
        WHERE alt.alt_title ILIKE ${`%${searchTerm}%`}
        ORDER BY rank DESC, title
        LIMIT 20
      `);

      // Return the formatted results
      res.json(results);
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