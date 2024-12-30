import type { Express } from "express";
import { createServer, type Server } from "http";
import { db } from "@db";
import { industries, roles, companies, trialPlans } from "@db/schema";
import { eq } from "drizzle-orm";

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
