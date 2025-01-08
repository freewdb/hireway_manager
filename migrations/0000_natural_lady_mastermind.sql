CREATE TABLE IF NOT EXISTS "soc_detailed_occupations" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(50) NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"minor_group_code" varchar(50) NOT NULL,
	"alternative_titles" text[],
	"searchable_text" text DEFAULT '' NOT NULL,
	"search_vector" text DEFAULT '' NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "soc_detailed_occupations_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "soc_major_groups" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(50) NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"search_vector" text DEFAULT '' NOT NULL,
	CONSTRAINT "soc_major_groups_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "soc_minor_groups" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(50) NOT NULL,
	"major_group_code" varchar(50) NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"search_vector" text DEFAULT '' NOT NULL,
	CONSTRAINT "soc_minor_groups_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "soc_sector_distribution" (
	"id" serial PRIMARY KEY NOT NULL,
	"soc_code" varchar(50) NOT NULL,
	"sector_label" text NOT NULL,
	"sample_size" integer NOT NULL,
	"percentage" numeric(5, 2) NOT NULL,
	"date_updated" date NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "soc_detailed_occupations" ADD CONSTRAINT "soc_detailed_occupations_minor_group_code_soc_minor_groups_code_fk" FOREIGN KEY ("minor_group_code") REFERENCES "public"."soc_minor_groups"("code") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "soc_minor_groups" ADD CONSTRAINT "soc_minor_groups_major_group_code_soc_major_groups_code_fk" FOREIGN KEY ("major_group_code") REFERENCES "public"."soc_major_groups"("code") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "soc_sector_distribution" ADD CONSTRAINT "soc_sector_distribution_soc_code_soc_detailed_occupations_code_fk" FOREIGN KEY ("soc_code") REFERENCES "public"."soc_detailed_occupations"("code") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
