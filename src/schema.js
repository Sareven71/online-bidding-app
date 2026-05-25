import { sql } from 'drizzle-orm';
import { text } from 'drizzle-orm/gel-core';
import { datetime, int, mysqlTable, serial, varchar, decimal, boolean } from 'drizzle-orm/mysql-core';

export const usersTable = mysqlTable('users_table', {
  id: serial().primaryKey(),
  name: varchar({ length: 255 }).notNull(),
  email: varchar({ length: 255 }).notNull().unique(),
  password: varchar({length: 255}).notNull(),
  emailVerified: boolean('email_verified').default(false),
});

export const itemsTable = mysqlTable('items_table', {
  id: serial().primaryKey(),
  name: varchar({length: 255}).notNull(),
  condition: varchar({length: 255}),
  category: varchar({length: 255}),
  manufacturedYear: varchar('manufactured_year',{length: 255}),
  description: varchar({length: 255}).notNull(),
  photo1: varchar({length: 255}),
  photo2: varchar({length: 255}),
  photo3: varchar({length: 255}),
  photo4: varchar({length: 255}),
  bidDate: datetime('bid_date'),
  userId: int('user_id').notNull(),
  startPrice: decimal('start_price'),
  endDate: datetime('end_date'),
  bidPrice: decimal('bid_price'),
  lastBidBy: int('last_bid_by'),
  isSold: boolean('is_sold').default(false),
  ownerId: int('owner_id'),
})

export const tokensTable = mysqlTable('tokens_table',{
  id: serial().primaryKey(),
  token: varchar({length:255}).notNull(),
  userId: int('user_id').notNull(),
})