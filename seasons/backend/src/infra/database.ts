import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { config } from 'dotenv';
import { pgTable, text, numeric, timestamp, varchar, serial, boolean, index } from 'drizzle-orm/pg-core';
import { eq, like, desc } from 'drizzle-orm';

config();

// Initialize PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Initialize Drizzle ORM
export const db = drizzle(pool);

export const usersTable = pgTable('users', {
  id: text('id').primaryKey(),
  email: text('email').unique().notNull(),
  walletPubkey: text('wallet_pubkey'),
  subscriptionId: text('subscription_id'),
  trialEnds: timestamp('trial_ends'),
  tixBalance: numeric('tix_balance').default('0'),
  mfaSecret: text('mfa_secret'),
  role: varchar('role', { length: 10 }).$type<'user' | 'admin'>().default('user'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  emailIdx: index('email_idx').on(table.email),
}));

export const seasonsTable = pgTable('seasons', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => usersTable.id),
  uri: text('uri').notNull(),
  merkleRoot: text('merkle_root').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const cardsTable = pgTable('cards', {
  seasonId: text('season_id').references(() => seasonsTable.id),
  leaf: text('leaf').primaryKey(),
  rarity: varchar('rarity', { length: 10 }).$type<'platinum' | 'gold' | 'silver' | 'bronze'>().notNull(),
  ownerId: text('owner_id').references(() => usersTable.id),
  purchasePrice: numeric('purchase_price'),
  forSale: boolean('for_sale').default(false),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  ownerIdx: index('owner_idx').on(table.ownerId),
}));

export const paymentsTable = pgTable('payments', {
  id: serial('id').primaryKey(),
  seasonId: text('season_id').references(() => seasonsTable.id),
  amount: numeric('amount').notNull(),
  type: varchar('type', { length: 20 }).$type<'community' | 'platform'>().notNull(),
  processed: boolean('processed').default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

export const followsTable = pgTable('follows', {
  followerId: text('follower_id').references(() => usersTable.id),
  followingId: text('following_id').references(() => usersTable.id),
  createdAt: timestamp('created_at').defaultNow(),
});

export const activitiesTable = pgTable('activities', {
  id: serial('id').primaryKey(),
  userId: text('user_id').references(() => usersTable.id),
  type: varchar('type', { length: 20 }).$type<'upload' | 'purchase' | 'follow' | 'sale'>().notNull(),
  targetId: text('target_id'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  createdAtIdx: index('created_at_idx').on(table.createdAt),
}));

export const getUserByEmail = async (email: string) => {
  const user = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  return user[0];
};

export const searchUsers = async (query: string) => {
  return await db.select().from(usersTable).where(like(usersTable.email, `%${query}%`)).limit(10);
};