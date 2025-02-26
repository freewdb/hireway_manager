import { pgTable, text, serial, varchar, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { sql } from "drizzle-orm";

// SOC Classification tables
export const socMajorGroups = pgTable('soc_major_groups', {
  id: serial('id').primaryKey(),
  code: varchar('code', { length: 7 }).notNull().unique(),
  title: text('title').notNull(),
  description: text('description'),
  searchVector: text('search_vector').notNull()
});

export const socMinorGroups = pgTable('soc_minor_groups', {
  id: serial('id').primaryKey(),
  code: varchar('code', { length: 7 }).notNull().unique(),
  majorGroupCode: varchar('major_group_code', { length: 7 })
    .notNull()
    .references(() => socMajorGroups.code),
  title: text('title').notNull(),
  description: text('description'),
  searchVector: text('search_vector').notNull()
});

export const socDetailedOccupations = pgTable('soc_detailed_occupations', {
  id: serial('id').primaryKey(),
  code: varchar('code', { length: 7 }).notNull().unique(),
  title: text('title').notNull(),
  description: text('description'),
  minorGroupCode: varchar('minor_group_code', { length: 7 })
    .notNull()
    .references(() => socMinorGroups.code),
  alternativeTitles: text('alternative_titles').array(),
  searchableText: text('searchable_text').notNull().default(sql`''`),
  searchVector: text('search_vector').notNull(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// Create schemas for validation
export const insertSocMajorGroupSchema = createInsertSchema(socMajorGroups);
export const selectSocMajorGroupSchema = createSelectSchema(socMajorGroups);

export const insertSocMinorGroupSchema = createInsertSchema(socMinorGroups);
export const selectSocMinorGroupSchema = createSelectSchema(socMinorGroups);

export const insertSocDetailedOccupationSchema = createInsertSchema(socDetailedOccupations);
export const selectSocDetailedOccupationSchema = createSelectSchema(socDetailedOccupations);

// Type definitions for TypeScript
export type SocMajorGroup = typeof socMajorGroups.$inferSelect;
export type InsertSocMajorGroup = typeof socMajorGroups.$inferInsert;

export type SocMinorGroup = typeof socMinorGroups.$inferSelect;
export type InsertSocMinorGroup = typeof socMinorGroups.$inferInsert;

export type SocDetailedOccupation = typeof socDetailedOccupations.$inferSelect;
export type InsertSocDetailedOccupation = typeof socDetailedOccupations.$inferInsert;

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