ALTER TABLE "project_briefs" ADD COLUMN "needs_auth" boolean;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "needs_auth" boolean DEFAULT true NOT NULL;