import { spawnSync } from "node:child_process";
import { join } from "node:path";

import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

if (!process.env.DATABASE_URL) {
  console.error(
    "Thiếu DATABASE_URL. Hãy tạo .env.local từ .env.example trước khi chạy migration.",
  );
  process.exitCode = 1;
} else {
  const cli = join(
    process.cwd(),
    "node_modules",
    "drizzle-kit",
    "bin.cjs",
  );
  const result = spawnSync(process.execPath, [cli, "migrate"], {
    cwd: process.cwd(),
    env: process.env,
    stdio: "inherit",
    windowsHide: true,
  });
  process.exitCode = result.status ?? 1;
}
