import { jsonb, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const siteSettings = pgTable("site_settings", {
  key: text().primaryKey(),
  value: jsonb().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const articles = pgTable("articles", {
  id: serial().primaryKey(),
  title: text().notNull(),
  excerpt: text().notNull().default(""),
  body: text().notNull().default(""),
  imageUrl: text("image_url"),
  status: text().notNull().default("published"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
