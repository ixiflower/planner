import { pgTable, serial, text, boolean, timestamp, integer, jsonb } from "drizzle-orm/pg-core";
import { users } from "./users-tasks.js";
import { relations } from "drizzle-orm";

// ─── Reports ───
export const reports = pgTable("reports", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tasks: jsonb("tasks"),
  note: text("note"),
  status: text("status").default("pending"),
  rating: integer("rating").default(0),
  date: timestamp("date").defaultNow(),
});

export const reportImages = pgTable("report_images", {
  id: serial("id").primaryKey(),
  reportId: integer("report_id").notNull().references(() => reports.id, { onDelete: "cascade" }),
  image: text("image").notNull(),
});

// ─── Submissions ───
export const submissions = pgTable("submissions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  reportId: integer("report_id").references(() => reports.id),
  rating: integer("rating").default(0),
  status: text("status").default("pending"),
  date: timestamp("date").defaultNow(),
});

// ─── Notifications ───
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  message: text("message").notNull(),
  link: text("link"),
  isRead: boolean("is_read").default(false),
  isSaved: boolean("is_saved").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// ─── Working Hours ───
export const workingHours = pgTable("working_hours", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  date: timestamp("date").defaultNow(),
  morningCheckIn: timestamp("morning_check_in"),
  morningCheckOut: timestamp("morning_check_out"),
  afternoonCheckIn: timestamp("afternoon_check_in"),
  afternoonCheckOut: timestamp("afternoon_check_out"),
  currentShift: text("current_shift").default("none"),
  isCurrentlyWorking: boolean("is_currently_working").default(false),
  morningPartialTime: integer("morning_partial_time"),
  afternoonPartialTime: integer("afternoon_partial_time"),
});

// ─── Chat ───
export const chatRooms = pgTable("chat_rooms", {
  id: serial("id").primaryKey(),
  user1Id: integer("user1_id").references(() => users.id),
  user2Id: integer("user2_id").references(() => users.id),
  isGroup: boolean("is_group").default(false),
  name: text("name"),
  slug: text("slug"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  chatRoomId: integer("chat_room_id").notNull().references(() => chatRooms.id, { onDelete: "cascade" }),
  senderId: integer("sender_id").notNull().references(() => users.id),
  message: text("message"),
  image: text("image"),
  isSaved: boolean("is_saved").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// ─── Relations ───
export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  sender: one(users, { fields: [chatMessages.senderId], references: [users.id] }),
  room: one(chatRooms, { fields: [chatMessages.chatRoomId], references: [chatRooms.id] }),
}));

export const chatRoomsRelations = relations(chatRooms, ({ many }) => ({
  messages: many(chatMessages),
}));
