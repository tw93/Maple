// 重复标签页合并：只认完全相同的网址，宁可漏合也不误关
export const DEDUPE_SETTING_KEY = "MAPLE_DEDUPE_TABS";
const TABS_PERMISSION = { permissions: ["tabs"] };

const api = globalThis.browser ?? globalThis.chrome;

function isCandidate(tab) {
  if (!tab.url || tab.incognito || tab.pendingUrl || tab.status === "loading") {
    return false;
  }
  // Firefox 容器里的标签页是另一份登录态，撤销时没有 cookies 权限放不回原容器，不参与
  if (tab.cookieStoreId && tab.cookieStoreId !== "firefox-default") return false;
  // file: 页面撤销时打不开（Firefox 禁止 tabs.create 打开，Chrome 默认不给文件访问），不参与
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

// 在设置页或另一个面板里授权或撤销后，已经打开的面板跟着更新
export function onTabsPermissionChanged(callback) {
  api.permissions.onAdded?.addListener(() => callback());
  api.permissions.onRemoved?.addListener(() => callback());
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

export async function getDuplicateTabs() {
  const [tabs, currentWindowId] = await Promise.all([api.tabs.query({}), getCurrentWindowId()]);
  return findDuplicateTabs(tabs, currentWindowId);
}

/**
 * 关闭重复标签页，返回撤销时重新打开所需的信息
 * @returns {Promise<{ url: string, windowId: number, index: number }[]>}
 */
export async function closeDuplicateTabs() {
  const duplicates = await getDuplicateTabs();
  const closed = [];
  // 逐个关闭，关之前再读一次状态：刚被切到或开始出声的跳过，某个已被别处关掉也不影响其他标签页的撤销记录
  await Promise.all(
    duplicates.map(async (tab) => {
      try {
        const fresh = await api.tabs.get(tab.id);
        if (fresh.url !== tab.url || !isCandidate(fresh) || isProtected(fresh)) return;
        await api.tabs.remove(tab.id);
        // 位置取查询那一刻的，并行关闭时后读到的 index 可能已经前移
        const { url, windowId, index } = tab;
        closed.push({ url, windowId, index });
      } catch {
        // 标签页已经不在了
      }
    })
  );
  return closed.sort((a, b) => a.windowId - b.windowId || a.index - b.index);
}

export async function restoreTabs(closed) {
  for (const { url, windowId, index } of closed) {
    try {
      await api.tabs.create({ url, windowId, index, active: false });
    } catch {
      // 原窗口已经不在了，就开在当前窗口
      await api.tabs.create({ url, active: false }).catch(() => {});
    }
  }
}

const RELEVANT_UPDATES = ["url", "status", "pinned", "audible", "groupId", "hidden", "splitViewId"];

export function onTabsChanged(callback) {
  [api.tabs.onCreated, api.tabs.onRemoved, api.tabs.onActivated, api.tabs.onAttached].forEach((event) =>
    event?.addListener(() => callback())
  );
  // 标题、图标这类更新很频繁，只在影响判断的字段变化时刷新
  api.tabs.onUpdated?.addListener((tabId, changeInfo) => {
    if (RELEVANT_UPDATES.some((key) => key in changeInfo)) callback();
  });
}
