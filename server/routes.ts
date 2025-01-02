import type { Express } from "express";
import { createServer, type Server } from "http";
import { db } from "@db";
import { 
  socMajorGroups, 
  socMinorGroups, 
  socDetailedOccupations,
  industries,
  roles,
  trialPlans
} from "@db/schema";
import { eq, ilike, sql, and, or } from "drizzle-orm";

export function registerRoutes(app: Express): Server {
  // Get industries
  app.get("/api/industries", async (_req, res) => {
    try {
      const allIndustries = await db.select().from(industries);
      res.json(allIndustries);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch industries" });
    }
  });

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

  // Enhanced job titles search endpoint with full-text search and fuzzy matching
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
        .join(' & ');

      // Perform combined full-text and trigram search with weighted ranking
      const results = await db.execute<{
        code: string;
        title: string;
        description: string;
        alternativeTitles: string[];
        rank: number;
      }>(sql`
        WITH search_results AS (
          SELECT
            code,
            title,
            description,
            alternative_titles as "alternativeTitles",
            (
              ts_rank(search_vector, to_tsquery('english', ${searchQuery})) * 3.0 +
              similarity(title, ${searchTerm}) * 2.0 +
              GREATEST(
                COALESCE(
                  (
                    SELECT MAX(similarity(alt_title, ${searchTerm}))
                    FROM jsonb_array_elements_text(alternative_titles) alt_title
                  ),
                  0
                ),
                0
              )
            ) as rank
          FROM soc_detailed_occupations
          WHERE
            search_vector @@ to_tsquery('english', ${searchQuery})
            OR similarity(title, ${searchTerm}) > 0.3
            OR EXISTS (
              SELECT 1
              FROM jsonb_array_elements_text(alternative_titles) alt_title
              WHERE similarity(alt_title, ${searchTerm}) > 0.3
            )
        )
        SELECT *
        FROM search_results
        WHERE rank > 0
        ORDER BY rank DESC
        LIMIT 20
      `);

      // Format results for the frontend
      const formattedResults = results.map(row => {
        const alternativeTitles = Array.isArray(row.alternativeTitles) 
          ? row.alternativeTitles 
          : [];

        // Return primary title
        const results = [{
          title: row.title,
          code: row.code,
          isAlternative: false,
          rank: row.rank
        }];

        // Add matching alternative titles
        alternativeTitles
          .filter(alt => alt && alt.toLowerCase().includes(searchTerm.toLowerCase()))
          .forEach(alt => {
            results.push({
              title: alt,
              code: row.code,
              isAlternative: true,
              rank: row.rank * 0.8 // Slightly lower rank for alternative titles
            });
          });

        return results;
      }).flat();

      // Sort by rank and return
      res.json(formattedResults.sort((a, b) => b.rank - a.rank));
    } catch (error) {
      console.error('Error in job titles search:', error);
      res.status(500).json({ error: "Failed to search job titles" });
    }
  });

  // Get roles
  app.get("/api/roles", async (_req, res) => {
    try {
      const allRoles = await db.select().from(roles);
      res.json(allRoles);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch roles" });
    }
  });

  // Create trial plan
  app.post("/api/trial-plans", async (req, res) => {
    try {
      const newPlan = await db.insert(trialPlans).values(req.body).returning();
      res.json(newPlan[0]);
    } catch (error) {
      res.status(500).json({ error: "Failed to create trial plan" });
    }
  });

  // Get trial plan by id
  app.get("/api/trial-plans/:id", async (req, res) => {
    try {
      const plan = await db.select()
        .from(trialPlans)
        .where(eq(trialPlans.id, parseInt(req.params.id)));

      if (plan.length === 0) {
        return res.status(404).json({ error: "Trial plan not found" });
      }

      res.json(plan[0]);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch trial plan" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}