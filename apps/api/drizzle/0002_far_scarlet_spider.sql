ALTER TABLE "architecture_designs" ADD COLUMN "target_platform" text DEFAULT 'web' NOT NULL;--> statement-breakpoint
ALTER TABLE "project_briefs" ADD COLUMN "target_platform" text DEFAULT 'web' NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "target_platform" text DEFAULT 'web' NOT NULL;