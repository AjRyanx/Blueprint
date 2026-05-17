ALTER TABLE "architecture_designs" ADD COLUMN "needs_server" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "architecture_designs" ADD COLUMN "server_notes" text;--> statement-breakpoint
ALTER TABLE "project_briefs" ADD COLUMN "needs_server" boolean;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "needs_server" boolean DEFAULT true NOT NULL;