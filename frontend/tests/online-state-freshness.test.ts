import assert from "node:assert/strict";
import test from "node:test";

import { isFresherLiveState } from "../lib/online/stateFreshness";

const state = (
  ply: number,
  serverTime: number,
  status: "active" | "finished" = "active",
) => ({ ply, server_time: serverTime, status });

test("snapshot có ply cũ không ghi đè nước đi mới", () => {
  assert.equal(isFresherLiveState(state(8, 2_000), state(7, 3_000)), false);
  assert.equal(isFresherLiveState(state(7, 2_000), state(8, 1_000)), true);
});

test("cùng ply chỉ nhận snapshot có thời gian server mới hơn", () => {
  assert.equal(isFresherLiveState(state(8, 2_000), state(8, 1_999)), false);
  assert.equal(isFresherLiveState(state(8, 2_000), state(8, 2_001)), true);
});

test("ván đã kết thúc không bị response active về trễ mở lại", () => {
  assert.equal(
    isFresherLiveState(state(18, 2_000, "finished"), state(18, 3_000)),
    false,
  );
  assert.equal(
    isFresherLiveState(state(18, 2_000), state(18, 1_999, "finished")),
    true,
  );
});
