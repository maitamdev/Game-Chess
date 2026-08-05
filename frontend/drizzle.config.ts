import { loadEnvConfig } from "@next/env";
import { defineConfig } from "drizzle-kit";

loadEnvConfig(process.cwd());

const databaseUrl = process.env.DATABASE_URL;
const isMigrateCommand = process.argv.some((argument) => argument === "migrate");
if (isMigrateCommand && !databaseUrl) {
  throw new Error(
    "Thiếu DATABASE_URL. Hãy tạo .env.local từ .env.example trước khi chạy migration.",
  );
}

export default defineConfig({
  schema: "./lib/server/db/schema.ts",
  out: "./supabase/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url:
      databaseUrl ??
      "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
  },
});
