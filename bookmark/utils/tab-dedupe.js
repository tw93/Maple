// 重复标签页合并：只认完全相同的网址，宁可漏合也不误关
export const DEDUPE_SETTING_KEY = "MAPLE_DEDUPE_TABS";
const TABS_PERMISSION = { permissions: ["tabs"] };

const api = globalThis.browser ?? globalThis.chrome;

function isCandidate(tab) {
  if (!tab.url || tab.incognito || tab.pendingUrl || tab.status === "loading") {
    return false;
  }
  // Firefox 容器里的标签页是另一份登录态，网址相同也不算重复
  if (tab.cookieStoreId && tab.cookieStoreId !== "firefox-default") return false;
  // 只管网页，file: 和浏览器自己的页面不参与
  return /^https?:/.test(tab.url);
}

const isSet = (id) => typeof id === "number" && id !== -1;

// 用户正在看、固定、在放声音、放进分组或分屏的标签页，以及 Firefox 里被分组扩展藏起来的标签页，都说明它有用途，一律不关
function isProtected(tab) {
  return tab.active || tab.pinned || tab.audible || tab.hidden || isSet(tab.groupId) || isSet(tab.splitViewId);
}

function preferToKeep(currentWindowId) {
  return (a, b) => {
    const aCurrent = a.windowId === currentWindowId ? 1 : 0;
    const bCurrent = b.windowId === currentWindowId ? 1 : 0;
    if (aCurrent !== bCurrent) return bCurrent - aCurrent;
    const accessed = (b.lastAccessed || 0) - (a.lastAccessed || 0);
    if (accessed !== 0) return accessed;
    return a.id - b.id;
  };
}

/**
 * 找出可以关闭的重复标签页
 * @param {chrome.tabs.Tab[]} tabs 所有窗口的标签页
 * @param {number} currentWindowId 当前窗口，同组里优先保留它的那一个
 * @returns {chrome.tabs.Tab[]} 要关闭的标签页
 */
export function findDuplicateTabs(tabs, currentWindowId) {
  const groups = new Map();
  for (const tab of tabs) {
    if (!isCandidate(tab)) continue;
    const list = groups.get(tab.url);
    if (list) list.push(tab);
    else groups.set(tab.url, [tab]);
  }

  const toClose = [];
  for (const list of groups.values()) {
    if (list.length < 2) continue;
    const closable = list.filter((tab) => !isProtected(tab));
    // 组里有受保护的标签页时它就是保留的那份，否则留下当前窗口里最近用过的
    if (closable.length === list.length) {
      closable.sort(preferToKeep(currentWindowId));
      closable.shift();
    }
    toClose.push(...closable);
  }
  return toClose;
}

/**
 * 新开的标签页和已有的某个标签页网址完全相同时，找出原来那个，关掉新的并切过去
 * @param {chrome.tabs.Tab[]} tabs 所有窗口的标签页
 * @param {chrome.tabs.Tab} opened 刚打开网页的新标签页
 * @returns {chrome.tabs.Tab | null} 要切过去的标签页，没有就不动
 */
export function findOpenCopy(tabs, opened) {
  if (!opened?.url || !/^https?:/.test(opened.url) || opened.incognito || opened.hidden) return null;
  // 新标签页被放进分组、固定或分屏，说明是有意这样开的
  if (opened.pinned || isSet(opened.groupId) || isSet(opened.splitViewId)) return null;
  if (opened.cookieStoreId && opened.cookieStoreId !== "firefox-default") return null;
  const copies = tabs.filter(
    (tab) =>
      tab.id !== opened.id &&
      tab.url === opened.url &&
      !tab.incognito &&
      !tab.hidden &&
      !tab.pendingUrl &&
      (!tab.cookieStoreId || tab.cookieStoreId === "firefox-default")
  );
  copies.sort(preferToKeep(opened.windowId));
  return copies[0] || null;
}

export function isDedupeEnabled() {
  return localStorage.getItem(DEDUPE_SETTING_KEY) === "true";
}

export async function hasTabsPermission() {
  try {
    return await api.permissions.contains(TABS_PERMISSION);
  } catch {
    return false;
  }
}

// 必须在用户点击的同一个事件里直接调用，前面不能有 await，否则浏览器会拒绝弹出授权
export function requestTabsPermission() {
  return api.permissions.request(TABS_PERMISSION).catch(() => false);
}

export function removeTabsPermission() {
  return api.permissions.remove(TABS_PERMISSION).catch(() => false);
}

async function getCurrentWindowId() {
  try {
    const win = await api.windows.getCurrent();
    return win?.id;
  } catch {
    return undefined;
  }
}

// 只看普通窗口，PWA 和弹出窗口里的页面不算重复
export async function getDuplicateTabs() {
  const [tabs, currentWindowId] = await Promise.all([api.tabs.query({ windowType: "normal" }), getCurrentWindowId()]);
  return findDuplicateTabs(tabs, currentWindowId);
}

/**
 * 关闭重复标签页
 * @returns {Promise<number>} 实际关掉的数量
 */
export async function closeDuplicateTabs() {
  const duplicates = await getDuplicateTabs();
  let closed = 0;
  // 逐个关闭，关之前再读一次状态：刚被切到或开始出声的跳过，某个已被别处关掉也不影响其他标签页
  await Promise.all(
    duplicates.map(async (tab) => {
      try {
        const fresh = await api.tabs.get(tab.id);
        if (fresh.url !== tab.url || !isCandidate(fresh) || isProtected(fresh)) return;
        await api.tabs.remove(tab.id);
        closed++;
      } catch {
        // 标签页已经不在了
      }
    })
  );
  return closed;
}
