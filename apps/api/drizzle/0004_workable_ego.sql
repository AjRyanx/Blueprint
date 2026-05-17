ALTER TABLE "project_briefs" ADD COLUMN "deployment_model" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "deployment_model" text DEFAULT 'cloud' NOT NULL;