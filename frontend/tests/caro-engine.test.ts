import { test } from "node:test";
import assert from "node:assert/strict";
import { searchCaro, CARO_MATE } from "../lib/caro/engine";
import { parseCaroUci } from "../lib/caro/rules";

test("Caro Engine - Opening moves", () => {
  const res1 = searchCaro([], { maxDepth: 1 });
  assert.equal(res1.ranked[0].uci, "100.100");

  const res2 = searchCaro(["100.100"], { maxDepth: 1 });
  const pt2 = parseCaroUci(res2.ranked[0].uci)!;
  const dist = Math.max(Math.abs(pt2.x - 100), Math.abs(pt2.y - 100));
  assert.equal(dist, 1, "AI must respond adjacent to opponent's center move");
});

test("Caro Engine - Immediate Win (Five in a row)", () => {
  const history = [
    "100.100", // X
    "100.101", // O
    "101.100", // X
    "101.101", // O
    "102.100", // X
    "102.101", // O
    "103.100", // X
    "100.102", // O
  ];
  const res = searchCaro(history, { maxDepth: 4 });
  const best = res.ranked[0].uci;
  assert.ok(best === "99.100" || best === "104.100", `AI should win with 5-in-a-row, got: ${best}`);
  assert.ok(res.ranked[0].score >= CARO_MATE - 100);
});

test("Caro Engine - Mandatory Defense against Opponent Five (Consecutive)", () => {
  const history = [
    "50.50",   // X
    "100.100", // O
    "60.60",   // X
    "101.100", // O
    "70.70",   // X
    "102.100", // O
    "80.80",   // X
    "103.100", // O
  ];
  const res = searchCaro(history, { maxDepth: 4 });
  const best = res.ranked[0].uci;
  assert.ok(best === "99.100" || best === "104.100", `AI must block opponent's four, got: ${best}`);
});

test("Caro Engine - Mandatory Defense against Split Four (Gap Threat)", () => {
  const history = [
    "50.50",   // X
    "100.100", // O
    "60.60",   // X
    "101.100", // O
    "70.70",   // X
    "103.100", // O
    "80.80",   // X
    "104.100", // O
  ];
  const res = searchCaro(history, { maxDepth: 4 });
  const best = res.ranked[0].uci;
  assert.equal(best, "102.100", `AI must detect and block split-four gap at 102.100, got: ${best}`);
});

test("Caro Engine - Blocks Opponent Open Three / Double Three Trap", () => {
  const history = [
    "50.50",   // X
    "100.100", // O
    "60.60",   // X
    "101.100", // O
    "70.70",   // X
    "102.100", // O
  ];
  const res = searchCaro(history, { maxDepth: 4 });
  const best = res.ranked[0].uci;
  assert.ok(best === "99.100" || best === "103.100", `AI must block open three ends, got: ${best}`);
});

test("Caro Engine - VCF Solver finds multi-step forced win", () => {
  const history = [
    "100.100", // X
    "103.100", // O (blocks horizontal right)
    "101.100", // X
    "99.104",  // O (blocks vertical down)
    "102.100", // X
    "10.10",   // O (dummy)
    "99.101",  // X
    "20.20",   // O (dummy)
    "99.102",  // X
    "30.30",   // O (dummy)
    "99.103",  // X
    "40.40",   // O (dummy)
  ];
  const res = searchCaro(history, { maxDepth: 8, useVcf: true });
  assert.equal(res.ranked[0].uci, "99.100", "AI VCF solver must find 99.100 as the forced winning move");
  assert.equal(res.ranked[0].score, CARO_MATE, "VCF win should report mate score");
});

test("Caro Engine - Performance and search depth", () => {
  // A quiet position where neither side has an early mate:
  // e.g. opening with stones spaced out normally
  const history = [
    "100.100", // X
    "100.101", // O
  ];
  const start = Date.now();
  const res = searchCaro(history, { maxDepth: 8, timeLimitMs: 500, useVcf: false });
  const elapsed = Date.now() - start;

  assert.ok(res.depth >= 4, `Engine should reach at least depth 4 in 500ms, reached depth: ${res.depth}`);
  assert.ok(res.nodes > 500, `Engine should explore hundreds/thousands of nodes, explored: ${res.nodes}`);
  assert.ok(elapsed <= 700, `Search should respect time limit, elapsed: ${elapsed}ms`);
});
