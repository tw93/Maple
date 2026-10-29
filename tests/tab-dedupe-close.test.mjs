import test from "node:test";
import assert from "node:assert/strict";
import { state } from "./helpers/fake-chrome.mjs";
import { closeDuplicateTabs } from "../bookmark/utils/tab-dedupe.js";

const tab = (id, extra = {}) => ({ id, url: "https://a.com", windowId: 1, index: id, active: false, pinned: false, audible: false, groupId: -1, status: "complete", lastAccessed: id, ...extra });

test("某个标签页已被别处关掉时，其余照常关闭", async () => {
  Object.assign(state, { tabs: [tab(1), tab(2), tab(3)], removed: [], fresh: { 1: null } });
  const closed = await closeDuplicateTabs();
  assert.deepEqual(state.removed, [2]);
  assert.equal(closed, 1);
});

test("关之前刚被切到或开始出声的标签页不关", async () => {
  Object.assign(state, { tabs: [tab(1), tab(2), tab(3), tab(4)], removed: [], fresh: { 2: { active: true }, 1: { audible: true } } });
  const closed = await closeDuplicateTabs();
  assert.deepEqual(state.removed, [3]);
  assert.equal(closed, 1);
});
