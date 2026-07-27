/**
 * Kết nối DB dùng chung cho route handlers.
 *
 * - Local dev: DATABASE_URL không đặt → file SQLite ./local.db.
 * - Vercel + Turso: DATABASE_URL=libsql://<db>.turso.io + DATABASE_AUTH_TOKEN.
 *
 * Cache trên globalThis để Next dev không mở lại kết nối sau mỗi hot-reload.
 */

import { createClient, type Client } from "@libsql/client";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";

import * as schema from "./schema";

export type Db = LibSQLDatabase<typeof schema>;

const globalForDb = globalThis as unknown as {
  __kydaiClient?: Client;
  __kydaiDb?: Db;
};

function makeClient(): Client {
  return createClient({
    url: process.env.DATABASE_URL ?? "file:./local.db",
    authToken: process.env.DATABASE_AUTH_TOKEN,
  });
}

export const client: Client = globalForDb.__kydaiClient ?? makeClient();
export const db: Db = globalForDb.__kydaiDb ?? drizzle(client, { schema });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__kydaiClient = client;
  globalForDb.__kydaiDb = db;
}

export * from "./schema";
