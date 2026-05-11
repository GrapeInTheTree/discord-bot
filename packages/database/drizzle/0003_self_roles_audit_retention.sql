ALTER TABLE "SelfRolesEvent" DROP CONSTRAINT "SelfRolesEvent_optionId_SelfRolesOption_id_fk";
--> statement-breakpoint
ALTER TABLE "SelfRolesEvent" ALTER COLUMN "optionId" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "SelfRolesEvent" ADD COLUMN "optionLabel" text;--> statement-breakpoint
ALTER TABLE "SelfRolesEvent" ADD COLUMN "optionEmoji" text;--> statement-breakpoint
ALTER TABLE "SelfRolesEvent" ADD COLUMN "optionRoleId" text;--> statement-breakpoint
ALTER TABLE "SelfRolesEvent" ADD CONSTRAINT "SelfRolesEvent_optionId_SelfRolesOption_id_fk" FOREIGN KEY ("optionId") REFERENCES "public"."SelfRolesOption"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "SelfRolesEvent_optionId_idx" ON "SelfRolesEvent" USING btree ("optionId");