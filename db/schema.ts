import { pgTable, text, serial, varchar, timestamp, integer, decimal, date } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { sql } from "drizzle-orm";

// SOC Classification tables
export const socMajorGroups = pgTable('soc_major_groups', {
  id: serial('id').primaryKey(),
  code: varchar('code', { length: 50 }).notNull().unique(),
  title: text('title').notNull(),
  description: text('description'),
  searchVector: text('search_vector').notNull().default('')
});

export const socMinorGroups = pgTable('soc_minor_groups', {
  id: serial('id').primaryKey(),
  code: varchar('code', { length: 50 }).notNull().unique(),
  majorGroupCode: varchar('major_group_code', { length: 50 }).notNull().references(() => socMajorGroups.code),
  title: text('title').notNull(),
  description: text('description'),
  searchVector: text('search_vector').notNull().default('')
});

export const socDetailedOccupations = pgTable('soc_detailed_occupations', {
  id: serial('id').primaryKey(),
  code: varchar('code', { length: 50 }).notNull().unique(),
  title: text('title').notNull(),
  description: text('description'),
  minorGroupCode: varchar('minor_group_code', { length: 50 }).notNull().references(() => socMinorGroups.code),
  alternativeTitles: text('alternative_titles').array(),
  searchableText: text('searchable_text').notNull().default(''),
  searchVector: text('search_vector').notNull().default(''),
  updatedAt: timestamp('updated_at').defaultNow()
});

export const socSectorDistribution = pgTable('soc_sector_distribution', {
  id: serial('id').primaryKey(),
  socCode: varchar('soc_code', { length: 50 }).notNull().references(() => socDetailedOccupations.code),
  sectorLabel: varchar('sector_label', { length: 10 }).notNull(),
  percentage: decimal('percentage', { precision: 5, scale: 2 }).notNull()
});

// Create schemas for validation
export const insertSocMajorGroupSchema = createInsertSchema(socMajorGroups);
export const selectSocMajorGroupSchema = createSelectSchema(socMajorGroups);

export const insertSocMinorGroupSchema = createInsertSchema(socMinorGroups);
export const selectSocMinorGroupSchema = createSelectSchema(socMinorGroups);

export const insertSocDetailedOccupationSchema = createInsertSchema(socDetailedOccupations);
export const selectSocDetailedOccupationSchema = createSelectSchema(socDetailedOccupations);

export const insertSocSectorDistributionSchema = createInsertSchema(socSectorDistribution);
export const selectSocSectorDistributionSchema = createSelectSchema(socSectorDistribution);

// Type definitions for TypeScript
export type SocMajorGroup = typeof socMajorGroups.$inferSelect;
export type InsertSocMajorGroup = typeof socMajorGroups.$inferInsert;

export type SocMinorGroup = typeof socMinorGroups.$inferSelect;
export type InsertSocMinorGroup = typeof socMinorGroups.$inferInsert;

export type SocDetailedOccupation = typeof socDetailedOccupations.$inferSelect;
export type InsertSocDetailedOccupation = typeof socDetailedOccupations.$inferInsert;

export type SocSectorDistribution = typeof socSectorDistribution.$inferSelect;
export type InsertSocSectorDistribution = typeof socSectorDistribution.$inferInsert;

export const sectorLookup = pgTable('sectorlu', {
  id: serial('id').primaryKey(),
  naics: varchar('naics', { length: 5 }).notNull(),
  concat: varchar('concat', { length: 10 }).notNull(),
  sector: varchar('sector', { length: 255 }).notNull()
});

export type SectorLookup = typeof sectorLookup.$inferSelect;
export type InsertSectorLookup = typeof sectorLookup.$inferInsert;

// Export additional interface for the API response
export interface JobTitleSearchResult {
  code: string;
  title: string;
  isAlternative: boolean;
  rank?: number;
  description?: string;
  majorGroup?: {
    code: string;
    title: string;
  };
  minorGroup?: {
    code: string;
    title: string;
  };
}