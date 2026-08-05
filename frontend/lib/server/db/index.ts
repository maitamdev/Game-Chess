/**
 * Kết nối PostgreSQL của Supabase qua connection string phía server.
 *
 * Dùng Supabase Transaction Pooler khi deploy serverless. Không đưa
 * DATABASE_URL ra biến NEXT_PUBLIC_*.
 */

import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres, { type Sql } from "postgres";

import * as schema from "./schema";

export type Db = PostgresJsDatabase<typeof schema>;

const globalForDb = globalThis as unknown as {
  __kydaiSql?: Sql;
  __kydaiDb?: Db;
};

const connectionString =
  process.env.DATABASE_URL ??
  "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const configuredPoolMax = Number(process.env.DATABASE_POOL_MAX);
const poolMax =
  Number.isInteger(configuredPoolMax) &&
  configuredPoolMax >= 1 &&
  configuredPoolMax <= 20
    ? configuredPoolMax
    : process.env.NODE_ENV === "production"
      ? 5
      : 2;
const configuredConnectTimeout = Number(process.env.DATABASE_CONNECT_TIMEOUT);
const connectTimeout =
  Number.isInteger(configuredConnectTimeout) &&
  configuredConnectTimeout >= 1 &&
  configuredConnectTimeout <= 60
    ? configuredConnectTimeout
    : 10;

export const client =
  globalForDb.__kydaiSql ??
  postgres(connectionString, {
    prepare: false,
    max: poolMax,
    idle_timeout: 20,
    connect_timeout: connectTimeout,
  });

export const db = globalForDb.__kydaiDb ?? drizzle(client, { schema });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__kydaiSql = client;
  globalForDb.__kydaiDb = db;
}

export * from "./schema";
