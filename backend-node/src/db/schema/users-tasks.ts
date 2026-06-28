import { pgTable, serial, text, varchar, boolean, timestamp, integer, pgEnum, jsonb } from "drizzle-orm/pg-core";

export const teamRoleEnum = pgEnum("team_role", ["None", "Leader", "Mod", "Member"]);
export const ticketStatusEnum = pgEnum("ticket_status", ["pending", "approved", "rejected"]);
export const shiftEnum = pgEnum("current_shift", ["morning", "afternoon", "none"]);

// ─── Users (merged UserProfile into User) ───
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 150 }).notNull().unique(),
  email: varchar("email", { length: 254 }).notNull(),
  password: varchar("password", { length: 128 }).notNull(),
  firstName: varchar("first_name", { length: 150 }).default(""),
  lastName: varchar("last_name", { length: 150 }).default(""),
  profilePicture: text("profile_picture"),
  teamRole: teamRoleEnum("team_role").default("None"),
  telegramId: varchar("telegram_id", { length: 64 }),
  adminTaskList: jsonb("admin_task_list").default([]),
  developer: boolean("developer").default(false),
  isValidate: boolean("is_validate").default(false),
  canSeeWorkHours: boolean("can_see_work_hours").default(false),
  bio: text("bio"),
  lastSeen: timestamp("last_seen"),
  isV2rayAdmin: boolean("is_v2ray_admin").default(false),
  hasV2rayAccess: boolean("has_v2ray_access").default(false),
  dailyEventsJson: jsonb("daily_events_json"),
  notepadContent: text("notepad_content"),
  isStaff: boolean("is_staff").default(false),
  isSuperuser: boolean("is_superuser").default(false),
  isActive: boolean("is_active").default(true),
  dateJoined: timestamp("date_joined").defaultNow(),
  emailVerified: boolean("email_verified").default(false),
  emailOtp: varchar("email_otp", { length: 256 }),
  emailOtpExpires: timestamp("email_otp_expires"),
});

// ─── Calendar Events (Tasks) ───
export const calendarEvents = pgTable("calendar_events", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  color: text("color").default("blue"),
  isImportant: boolean("is_important").default(false),
  category: text("category").default("general"),
});

// ─── Permanent Notes ───
export const permanentNotes = pgTable("permanent_notes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title"),
  content: text("content"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ─── Assigned Tasks ───
export const assignedTasks = pgTable("assigned_tasks", {
  id: serial("id").primaryKey(),
  assignedById: integer("assigned_by_id").references(() => users.id),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title"),
  text: text("text"),
  done: boolean("done").default(false),
  date: timestamp("date").defaultNow(),
});

// ─── Employee Todos ───
export const employeeTodos = pgTable("employee_todos", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  text: text("text").notNull(),
  done: boolean("done").default(false),
  date: timestamp("date").defaultNow(),
});

// ─── Daily Goals ───
export const dailyGoals = pgTable("daily_goals", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  text: text("text").notNull(),
  completed: boolean("completed").default(false),
  date: timestamp("date").defaultNow(),
  priority: integer("priority").default(0),
  category: text("category"),
  color: text("color"),
  notes: text("notes"),
  targetTime: text("target_time"),
});

// ─── Event Templates ───
export const eventTemplates = pgTable("event_templates", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name"),
  title: text("title"),
  color: text("color"),
  category: text("category"),
});

// ─── Exercises ───
export const exercises = pgTable("exercises", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
});

// ─── Checklist Items ───
export const checklistItems = pgTable("checklist_items", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  text: text("text").notNull(),
  completed: boolean("completed").default(false),
});
