// 打开面板的快捷键再按一次时收起面板：Chrome 会自己处理，ego lite 这类浏览器在面板获得焦点后不会
const SYMBOLS = { "⌘": "Command", "⌃": "MacCtrl", "⌥": "Alt", "⇧": "Shift" };

/**
 * 把 commands.getAll() 返回的快捷键解析成按键条件
 * @param {string} shortcut Chrome 在 Mac 上是 "⇧⌘E"，其他平台和 Firefox 是 "Ctrl+Shift+E"
 * @param {boolean} isMac Firefox 在 Mac 上用 "Ctrl" 表示 Command
 */
export function parseShortcut(shortcut, isMac) {
  if (!shortcut) return null;
  const mods = [];
  let key = "";
  if (/[⌘⌃⌥⇧]/.test(shortcut)) {
    for (const ch of shortcut.trim()) {
      if (SYMBOLS[ch]) mods.push(SYMBOLS[ch]);
      else key += ch;
    }
  } else {
    const parts = shortcut.split("+").map((part) => part.trim());
    key = parts.pop();
    mods.push(...parts);
  }
  if (!key) return null;
  const want = { key: key.toLowerCase(), meta: false, ctrl: false, alt: false, shift: false };
  for (const mod of mods) {
    if (mod === "Command") want.meta = true;
    else if (mod === "MacCtrl") want.ctrl = true;
    else if (mod === "Ctrl") want[isMac ? "meta" : "ctrl"] = true;
    else if (mod === "Alt" || mod === "Option") want.alt = true;
    else if (mod === "Shift") want.shift = true;
  }
  return want;
}

export function matchesShortcut(want, event) {
  if (!want) return false;
  const sameMods =
    event.metaKey === want.meta && event.ctrlKey === want.ctrl && event.altKey === want.alt && event.shiftKey === want.shift;
  if (!sameMods) return false;
  // 字母和数字按物理键比，Mac 上按住 Option 时 event.key 会变成别的字符
  if (/^[a-z]$/.test(want.key)) return event.code === `Key${want.key.toUpperCase()}`;
  if (/^[0-9]$/.test(want.key)) return event.code === `Digit${want.key}`;
  return (event.key || "").toLowerCase() === want.key;
}
