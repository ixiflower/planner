import { pgTable, serial, text, boolean, timestamp, integer, jsonb, varchar } from "drizzle-orm/pg-core";
import { users } from "./users-tasks";

// ─── Structure Boards (Canvas) ───
export const structureBoards = pgTable("structure_boards", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  ownerId: integer("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  data: jsonb("data"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ─── Services ───
export const services = pgTable("services", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  url: text("url").notNull(),
  status: text("status").default("unknown"),
  ownerId: integer("owner_id").references(() => users.id, { onDelete: "set null" }),
});

// ─── Groups ───
export const groups = pgTable("groups", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  ownerId: integer("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  inviteCode: text("invite_code").notNull().unique(),
  isPublic: boolean("is_public").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const groupMemberships = pgTable("group_memberships", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id").notNull().references(() => groups.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: text("role").default("member"),
});

// ─── Telegram Bots ───
export const telegram = pgTable("telegram", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  botName: text("bot_name"),
  apiToken: text("api_token"),
  isActive: boolean("is_active").default(false),
  botStatus: text("bot_status").default("idle"),
  sendLog: boolean("send_log").default(false),
  sendReport: boolean("send_report").default(false),
  sendTasks: boolean("send_tasks").default(false),
  sendDollarPrice: boolean("send_dollar_price").default(false),
  sendGoldPrice: boolean("send_gold_price").default(false),
  sendSubmissions: boolean("send_submissions").default(false),
  sendTeam: boolean("send_team").default(false),
  dollarPriceCmd: text("dollar_price_cmd").default("/dollar"),
  goldPriceCmd: text("gold_price_cmd").default("/gold"),
  isIxiBot: boolean("is_ixi_bot").default(false),
  googleSheetsAutoSyncEnabled: boolean("google_sheets_auto_sync_enabled").default(false),
  googleSheetsSyncInterval: integer("google_sheets_sync_interval").default(10),
  saeDataEnabled: boolean("sae_data_enabled").default(false),
  saeAutomationInterval: integer("sae_automation_interval").default(5),
});

// ─── V2Ray Configs ───
export const v2rayConfigs = pgTable("v2ray_configs", {
  id: serial("id").primaryKey(),
  title: text("title"),
  text: text("text"),
  status: text("status").default("off"),
});

// ─── Config Files ───
export const configFiles = pgTable("config_files", {
  id: serial("id").primaryKey(),
  file: text("file").notNull(),
  uploadedById: integer("uploaded_by_id").references(() => users.id),
  recipientId: integer("recipient_id").references(() => users.id),
  isPublic: boolean("is_public").default(false),
  targetRole: text("target_role"),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
});

// ─── Tickets ───
export const tickets = pgTable("tickets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  subject: text("subject").notNull(),
  description: text("description"),
  status: text("status").default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
});
