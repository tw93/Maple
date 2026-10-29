import test from "node:test";
import assert from "node:assert/strict";
import { findDuplicateTabs, findOpenCopy } from "../bookmark/utils/tab-dedupe.js";

let nextId = 1;
const tab = (url, extra = {}) => ({ id: nextId++, url, windowId: 1, index: 0, active: false, pinned: false, audible: false, groupId: -1, status: "complete", lastAccessed: 0, ...extra });
const ids = (list) => list.map((t) => t.id).sort((a, b) => a - b);

test("只合并完全相同的网址", () => {
  const a = tab("https://a.com/x"), b = tab("https://a.com/x#h"), c = tab("https://a.com/x?q=1"), d = tab("https://a.com/x");
  const out = findDuplicateTabs([a, b, c, d], 1);
  assert.equal(out.length, 1);
});

test("各窗口正在看的标签页都不关，两个窗口并排看同一页时一个都不动", () => {
  const a = tab("https://a.com", { windowId: 1, active: true }), b = tab("https://a.com", { windowId: 2, active: true });
  assert.deepEqual(findDuplicateTabs([a, b], 1), []);
});

test("有受保护的一份时，其余全部可关", () => {
  const a = tab("https://a.com", { windowId: 2, active: true }), b = tab("https://a.com"), c = tab("https://a.com", { windowId: 3 });
  assert.deepEqual(ids(findDuplicateTabs([a, b, c], 1)), ids([b, c]));
});

test("固定、出声、分组的标签页不关", () => {
  const list = [tab("https://a.com", { pinned: true }), tab("https://a.com", { audible: true }), tab("https://a.com", { groupId: 7 })];
  assert.deepEqual(findDuplicateTabs(list, 1), []);
});

test("都不受保护时保留当前窗口里最近用过的那个", () => {
  const old = tab("https://a.com", { windowId: 1, lastAccessed: 10 });
  const recent = tab("https://a.com", { windowId: 1, lastAccessed: 99 });
  const otherWin = tab("https://a.com", { windowId: 2, lastAccessed: 500 });
  const out = findDuplicateTabs([old, recent, otherWin], 1);
  assert.deepEqual(ids(out), ids([old, otherWin]));
});

test("加载中、跳转中、无痕和非网页标签页不参与", () => {
  const list = [
    tab("https://a.com", { status: "loading" }), tab("https://a.com", { pendingUrl: "https://b.com" }),
    tab("https://a.com", { incognito: true }), tab("https://a.com"),
    tab("chrome://newtab/"), tab("chrome://newtab/"), tab("about:blank"), tab("about:blank"),
  ];
  assert.deepEqual(findDuplicateTabs(list, 1), []);
});

test("Firefox 没有 groupId 时按未分组处理", () => {
  const a = tab("https://a.com", { groupId: undefined }), b = tab("https://a.com", { groupId: undefined });
  assert.equal(findDuplicateTabs([a, b], 1).length, 1);
});

test("file 页面不参与", () => {
  assert.deepEqual(findDuplicateTabs([tab("file:///a.pdf"), tab("file:///a.pdf")], 1), []);
});

test("Firefox 隐藏的标签页和 Chrome 分屏里的标签页不关", () => {
  const list = [tab("https://a.com", { hidden: true }), tab("https://a.com", { splitViewId: 3 })];
  assert.deepEqual(findDuplicateTabs(list, 1), []);
  assert.equal(findDuplicateTabs([tab("https://a.com", { splitViewId: -1 }), tab("https://a.com")], 1).length, 1);
});

test("Firefox 容器里的标签页不参与，默认容器照常合并", () => {
  const work = tab("https://mail.com", { cookieStoreId: "firefox-container-1" });
  const work2 = tab("https://mail.com", { cookieStoreId: "firefox-container-1" });
  assert.deepEqual(findDuplicateTabs([work, work2], 1), []);
  const def = tab("https://a.com", { cookieStoreId: "firefox-default" }), def2 = tab("https://a.com", { cookieStoreId: "firefox-default" });
  assert.equal(findDuplicateTabs([def, def2], 1).length, 1);
});

test("新开的网页已经开着时找出原来那个，优先同一窗口里最近用过的", () => {
  const old = tab("https://a.com", { windowId: 2, lastAccessed: 9 });
  const near = tab("https://a.com", { windowId: 1, lastAccessed: 1 });
  const nearer = tab("https://a.com", { windowId: 1, lastAccessed: 5 });
  const opened = tab("https://a.com", { windowId: 1, active: true, lastAccessed: 10 });
  assert.equal(findOpenCopy([old, near, nearer, opened], opened).id, nearer.id);
});

test("网址不完全相同、或只有自己时不切", () => {
  const opened = tab("https://a.com/x");
  assert.equal(findOpenCopy([tab("https://a.com/x#h"), tab("https://a.com/x?q=1"), opened], opened), null);
  assert.equal(findOpenCopy([opened], opened), null);
});

test("新标签页放进分组、固定或分屏，或是无痕和容器里开的，都不动", () => {
  for (const extra of [{ groupId: 4 }, { pinned: true }, { splitViewId: 2 }, { incognito: true }, { cookieStoreId: "firefox-container-1" }]) {
    const opened = tab("https://a.com", extra);
    assert.equal(findOpenCopy([tab("https://a.com"), opened], opened), null);
  }
});

test("无痕、容器、隐藏和还没加载出来的标签页不算原来那个", () => {
  const opened = tab("https://a.com");
  const list = [
    tab("https://a.com", { incognito: true }),
    tab("https://a.com", { cookieStoreId: "firefox-container-1" }),
    tab("https://a.com", { hidden: true }),
    tab("https://a.com", { pendingUrl: "https://b.com" }),
    opened,
  ];
  assert.equal(findOpenCopy(list, opened), null);
});

test("浏览器自己的页面不参与", () => {
  const opened = tab("chrome://settings/");
  assert.equal(findOpenCopy([tab("chrome://settings/"), opened], opened), null);
});

test("Firefox 里被藏起来的新标签页不动", () => {
  const opened = tab("https://a.com", { hidden: true });
  assert.equal(findOpenCopy([tab("https://a.com"), opened], opened), null);
});
