import { pgTable, text, serial, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

export const industries = pgTable("industries", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  naicsCode: text("naics_code").notNull(),
  description: text("description"),
});

export const companies = pgTable("companies", {
  id: serial("id").primaryKey(),
  size: text("size").notNull(), // small, medium, large
  stage: text("stage").notNull(), // startup, scaling, established
  location: text("location"),
  industryId: integer("industry_id").references(() => industries.id),
});

export const roles = pgTable("roles", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  onetCode: text("onet_code").notNull(),
  description: text("description"),
  skills: jsonb("skills").notNull(),
});

export const trialPlans = pgTable("trial_plans", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id),
  roleId: integer("role_id").references(() => roles.id),
  scenario: text("scenario").notNull(), // new, replacement, expansion
  trialLength: integer("trial_length").notNull(), // in weeks
  evaluationSchedule: jsonb("evaluation_schedule").notNull(),
  metrics: jsonb("metrics").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export type Industry = typeof industries.$inferSelect;
export type Role = typeof roles.$inferSelect;
export type Company = typeof companies.$inferSelect;
export type TrialPlan = typeof trialPlans.$inferSelect;
