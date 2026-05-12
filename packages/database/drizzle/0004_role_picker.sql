CREATE TABLE "RolePickerEvent" (
	"id" text PRIMARY KEY NOT NULL,
	"panelId" text NOT NULL,
	"userId" text NOT NULL,
	"optionId" text,
	"optionLabel" text,
	"optionEmoji" text,
	"optionRoleId" text,
	"action" text NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "RolePickerOption" (
	"id" text PRIMARY KEY NOT NULL,
	"panelId" text NOT NULL,
	"label" text NOT NULL,
	"description" text,
	"emoji" text,
	"roleId" text NOT NULL,
	"position" integer NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "RolePickerPanel" (
	"id" text PRIMARY KEY NOT NULL,
	"guildId" text NOT NULL,
	"channelId" text NOT NULL,
	"messageId" text NOT NULL,
	"embedTitle" text NOT NULL,
	"embedDescription" text NOT NULL,
	"placeholder" text NOT NULL,
	"selectionMode" text DEFAULT 'single' NOT NULL,
	"minValues" integer DEFAULT 1 NOT NULL,
	"maxValues" integer DEFAULT 1 NOT NULL,
	"customId" text NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "RolePickerEvent" ADD CONSTRAINT "RolePickerEvent_panelId_RolePickerPanel_id_fk" FOREIGN KEY ("panelId") REFERENCES "public"."RolePickerPanel"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "RolePickerEvent" ADD CONSTRAINT "RolePickerEvent_optionId_RolePickerOption_id_fk" FOREIGN KEY ("optionId") REFERENCES "public"."RolePickerOption"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "RolePickerOption" ADD CONSTRAINT "RolePickerOption_panelId_RolePickerPanel_id_fk" FOREIGN KEY ("panelId") REFERENCES "public"."RolePickerPanel"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "RolePickerEvent_panelId_userId_idx" ON "RolePickerEvent" USING btree ("panelId","userId");--> statement-breakpoint
CREATE INDEX "RolePickerEvent_createdAt_idx" ON "RolePickerEvent" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX "RolePickerEvent_optionId_idx" ON "RolePickerEvent" USING btree ("optionId");--> statement-breakpoint
CREATE INDEX "RolePickerOption_panelId_idx" ON "RolePickerOption" USING btree ("panelId");--> statement-breakpoint
CREATE UNIQUE INDEX "RolePickerOption_panelId_label_key" ON "RolePickerOption" USING btree ("panelId","label");--> statement-breakpoint
CREATE UNIQUE INDEX "RolePickerOption_panelId_position_key" ON "RolePickerOption" USING btree ("panelId","position");--> statement-breakpoint
CREATE UNIQUE INDEX "RolePickerOption_panelId_roleId_key" ON "RolePickerOption" USING btree ("panelId","roleId");--> statement-breakpoint
CREATE INDEX "RolePickerPanel_guildId_idx" ON "RolePickerPanel" USING btree ("guildId");--> statement-breakpoint
CREATE INDEX "RolePickerPanel_messageId_idx" ON "RolePickerPanel" USING btree ("messageId");--> statement-breakpoint
CREATE INDEX "RolePickerPanel_customId_idx" ON "RolePickerPanel" USING btree ("customId");--> statement-breakpoint
CREATE UNIQUE INDEX "RolePickerPanel_guildId_channelId_messageId_key" ON "RolePickerPanel" USING btree ("guildId","channelId","messageId");