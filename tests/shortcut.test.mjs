import test from "node:test";
import assert from "node:assert/strict";
import { parseShortcut, matchesShortcut } from "../bookmark/utils/shortcut.js";

const ev = (code, mods = {}) => ({ code, key: code.replace(/^Key/, "").toLowerCase(), metaKey: false, ctrlKey: false, altKey: false, shiftKey: false, ...mods });

test("Chrome 在 Mac 上的符号写法", () => {
  const want = parseShortcut("⌘E", true);
  assert.equal(matchesShortcut(want, ev("KeyE", { metaKey: true })), true);
  assert.equal(matchesShortcut(want, ev("KeyE", { ctrlKey: true })), false);
  assert.equal(matchesShortcut(parseShortcut("⇧⌘E", true), ev("KeyE", { metaKey: true, shiftKey: true })), true);
});

test("Windows 和 Linux 的 Ctrl 写法", () => {
  const want = parseShortcut("Ctrl+E", false);
  assert.equal(matchesShortcut(want, ev("KeyE", { ctrlKey: true })), true);
  assert.equal(matchesShortcut(want, ev("KeyE", { metaKey: true })), false);
});

test("Firefox 在 Mac 上的 Ctrl 指 Command", () => {
  assert.equal(matchesShortcut(parseShortcut("Ctrl+E", true), ev("KeyE", { metaKey: true })), true);
});

test("多按或少按一个修饰键都不算", () => {
  const want = parseShortcut("⌘E", true);
  assert.equal(matchesShortcut(want, ev("KeyE", { metaKey: true, shiftKey: true })), false);
  assert.equal(matchesShortcut(want, ev("KeyE")), false);
  assert.equal(matchesShortcut(want, ev("KeyR", { metaKey: true })), false);
});

test("按住 Option 时按物理键比对", () => {
  const want = parseShortcut("⌥⌘E", true);
  assert.equal(matchesShortcut(want, { code: "KeyE", key: "´", metaKey: true, ctrlKey: false, altKey: true, shiftKey: false }), true);
});

test("没有设置快捷键时不拦截", () => {
  assert.equal(parseShortcut("", true), null);
  assert.equal(parseShortcut(undefined, false), null);
  assert.equal(matchesShortcut(null, ev("KeyE", { metaKey: true })), false);
});
