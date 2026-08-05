import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import { join } from "node:path";

import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";

import { runRoomFlows } from "./rooms-flow";

const databasePort = 55434;
const webPort = 3100;
const databaseUrl = `postgresql://postgres:postgres@127.0.0.1:${databasePort}/postgres`;
const webUrl = `http://127.0.0.1:${webPort}`;

async function runMigrations() {
  const tsxCli = join(
    process.cwd(),
    "node_modules",
    "tsx",
    "dist",
    "cli.mjs",
  );
  await new Promise<void>((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [tsxCli, join(process.cwd(), "scripts", "migrate.ts")],
      {
        cwd: process.cwd(),
        env: { ...process.env, DATABASE_URL: databaseUrl },
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: true,
      },
    );
    let output = "";
    const collect = (chunk: Buffer) => {
      output += chunk.toString("utf8");
    };
    child.stdout?.on("data", collect);
    child.stderr?.on("data", collect);
    child.once("error", reject);
    child.once("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Migration thất bại.\n${output}`));
    });
  });
}

function startProductionServer(
  targetDatabaseUrl = databaseUrl,
  connectTimeout = "10",
): {
  child: ChildProcess;
  logs: () => string;
} {
  const nextCli = join(process.cwd(), "node_modules", "next", "dist", "bin", "next");
  const child = spawn(process.execPath, [nextCli, "start", "-p", String(webPort)], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      DATABASE_URL: targetDatabaseUrl,
      DATABASE_POOL_MAX: "1",
      DATABASE_CONNECT_TIMEOUT: connectTimeout,
      GUEST_SESSION_SECRET: "local-e2e-secret-at-least-32-characters",
    },
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
  let output = "";
  const collect = (chunk: Buffer) => {
    output = `${output}${chunk.toString("utf8")}`.slice(-12_000);
  };
  child.stdout?.on("data", collect);
  child.stderr?.on("data", collect);
  return { child, logs: () => output };
}

async function waitForServer(child: ChildProcess, logs: () => string) {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`Production server dừng sớm.\n${logs()}`);
    }
    try {
      const response = await fetch(`${webUrl}/api/health`);
      if (response.ok) return;
    } catch {
      // Server chưa lắng nghe.
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`Production server không sẵn sàng sau 30 giây.\n${logs()}`);
}

async function waitForHealthStatus(
  child: ChildProcess,
  logs: () => string,
  expectedStatus: number,
) {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`Production server dừng sớm.\n${logs()}`);
    }
    try {
      const response = await fetch(`${webUrl}/api/health`);
      if (response.status === expectedStatus) {
        return response.json() as Promise<{
          status: string;
          database: string;
        }>;
      }
    } catch {
      // Server chưa lắng nghe.
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(
    `Health endpoint không trả ${expectedStatus} sau 30 giây.\n${logs()}`,
  );
}

async function stopChild(child: ChildProcess) {
  if (child.exitCode !== null) return;
  child.kill();
  await Promise.race([
    new Promise<void>((resolve) => child.once("exit", () => resolve())),
    new Promise<void>((resolve) => setTimeout(resolve, 5_000)),
  ]);
}

async function main() {
  const db = new PGlite();
  const socket = new PGLiteSocketServer({
    db,
    host: "127.0.0.1",
    port: databasePort,
    maxConnections: 20,
  });
  let app: ReturnType<typeof startProductionServer> | null = null;
  let socketStarted = false;
  try {
    await socket.start();
    socketStarted = true;
    await runMigrations();
    app = startProductionServer();
    await waitForServer(app.child, app.logs);
    await runRoomFlows(webUrl);

    await stopChild(app.child);
    app = startProductionServer(
      "postgresql://postgres:postgres@127.0.0.1:1/postgres",
      "1",
    );
    const unavailable = await waitForHealthStatus(app.child, app.logs, 503);
    assert.deepEqual(unavailable, {
      status: "error",
      database: "unavailable",
    });
  } finally {
    if (app) await stopChild(app.child);
    if (socketStarted) await socket.stop();
    await db.close();
  }
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
