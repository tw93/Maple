// Service worker that keeps popup and sidebar modes mutually exclusive.
// Mode is persisted in chrome.storage.local so it survives browser restarts.

import { findOpenCopy, closeDuplicateTabs, hasTabsPermission } from "./utils/tab-dedupe.js";

const MODE_KEY = "MAPLE_DISPLAY_MODE";
const MODE_POPUP = "popup";
const MODE_SIDEBAR = "sidebar";
const POPUP_PATH = "popup.html";

async function getStoredMode() {
  try {
    const result = await chrome.storage.local.get(MODE_KEY);
    return result[MODE_KEY] === MODE_SIDEBAR ? MODE_SIDEBAR : MODE_POPUP;
  } catch {
    return MODE_POPUP;
  }
}

// 侧栏模式下点图标和按 ⌘E 都由这里开关侧栏：ego lite 的 _execute_action 快捷键不会按 openPanelOnActionClick 打开侧栏
// 能跟踪开关状态的浏览器才接管，旧版 Chrome 仍交给 openPanelOnActionClick
const CAN_TOGGLE_PANEL = !!(chrome.sidePanel?.open && chrome.sidePanel?.close && chrome.sidePanel?.onOpened);
const OPEN_PANELS_KEY = "MAPLE_OPEN_PANELS";
// 收起后紧跟着的那次事件（按键自动重复，或面板里自己处理了快捷键）不能再把它打开，ego lite 实测在收起后 340ms 内
const REOPEN_GUARD_MS = 600;

// sidePanel.open 只能在用户操作的同一轮里同步调用，开关状态放在内存里
const openPanels = new Set();
const lastClosedAt = new Map();
chrome.storage.session
  ?.get(OPEN_PANELS_KEY)
  .then((stored) => (stored?.[OPEN_PANELS_KEY] || []).forEach((id) => openPanels.add(id)))
  .catch(() => {});

function saveOpenPanels() {
  chrome.storage.session?.set({ [OPEN_PANELS_KEY]: [...openPanels] }).catch(() => {});
}

chrome.sidePanel?.onOpened?.addListener(({ windowId }) => {
  openPanels.add(windowId);
  saveOpenPanels();
});

chrome.sidePanel?.onClosed?.addListener(({ windowId }) => {
  openPanels.delete(windowId);
  lastClosedAt.set(windowId, Date.now());
  saveOpenPanels();
});

function toggleSidePanel(windowId) {
  if (openPanels.has(windowId)) return chrome.sidePanel.close({ windowId });
  if (Date.now() - (lastClosedAt.get(windowId) || 0) < REOPEN_GUARD_MS) return;
  return chrome.sidePanel.open({ windowId });
}

async function applyMode(mode) {
  const isSidebar = mode === MODE_SIDEBAR;

  try {
    await chrome.action.setPopup({ popup: isSidebar ? "" : POPUP_PATH });
  } catch (e) {
    console.warn("Failed to set popup:", e);
  }

  if (chrome.sidePanel?.setPanelBehavior) {
    try {
      await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: isSidebar && !CAN_TOGGLE_PANEL });
    } catch (e) {
      console.warn("Failed to set side panel behavior:", e);
    }
  }
}

// 弹窗清空后点击图标或按快捷键会走到这里；Firefox 不支持 chrome.sidePanel，使用 sidebarAction 兜底
chrome.action.onClicked.addListener(async (tab) => {
  if (chrome.sidePanel) {
    if (!CAN_TOGGLE_PANEL || tab?.windowId === undefined) return; // 旧版 Chrome 已通过 setPanelBehavior 处理
    try {
      await toggleSidePanel(tab.windowId);
    } catch (e) {
      console.warn("Failed to toggle side panel:", e);
    }
    return;
  }
  const sidebarApi = globalThis.browser?.sidebarAction;
  if (sidebarApi?.open) {
    try {
      await sidebarApi.open();
    } catch (e) {
      console.warn("Failed to open Firefox sidebar:", e);
    }
  }
});

// 合并重复标签页：设置里开启后才有 tabs 权限，关闭时权限一并撤销，所以有权限就是开着
// 新开的标签页打开了已经开着的网页，就关掉新的，正在看它时切到原来那个；其余重复的等页面加载完统一关掉，正在看的那个保留
// 浏览器启动时恢复上次的标签页也会触发新建，这段时间里不当成新开的
const STARTUP_GRACE_MS = 10000;
const SWEEP_DELAY_MS = 500;
const FRESH_TABS_KEY = "MAPLE_FRESH_TABS";
// 跳转页加载完后通常立刻跳走，这段时间里仍算新开的
const REDIRECT_GRACE_MS = 2000;
let quietUntil = 0;
let sweepTimer = null;
// 新开的标签页到第一个网页加载完之前都算新开的，中间经过跳转页也认得出；后台被回收后从 storage.session 找回
// 值是第一个网页加载完的时间，还没加载完是 0
const freshTabs = new Map();
const freshTabsReady = (chrome.storage.session?.get(FRESH_TABS_KEY) ?? Promise.resolve())
  .then((stored) => (stored?.[FRESH_TABS_KEY] || []).forEach(([id, loadedAt]) => freshTabs.set(id, loadedAt)))
  .catch(() => {});

function saveFreshTabs() {
  chrome.storage.session?.set({ [FRESH_TABS_KEY]: [...freshTabs] }).catch(() => {});
}

function isFresh(tabId) {
  if (!freshTabs.has(tabId)) return false;
  const loadedAt = freshTabs.get(tabId);
  if (!loadedAt || Date.now() - loadedAt < REDIRECT_GRACE_MS) return true;
  freshTabs.delete(tabId);
  saveFreshTabs();
  return false;
}

// 切换和清理都排进同一个队列，否则同时开出几个相同网页时，各自都会把对方当成原来那个，全部被关掉
let dedupeQueue = Promise.resolve();
function enqueue(job) {
  dedupeQueue = dedupeQueue.then(job).catch((e) => console.warn("Failed to merge duplicate tabs:", e));
}

chrome.runtime.onStartup.addListener(() => {
  quietUntil = Date.now() + STARTUP_GRACE_MS;
});

async function sweepDuplicates() {
  if (await hasTabsPermission()) await closeDuplicateTabs();
}

function scheduleSweep() {
  clearTimeout(sweepTimer);
  sweepTimer = setTimeout(() => enqueue(sweepDuplicates), SWEEP_DELAY_MS);
}

async function switchToOpenCopy(tabId) {
  if (Date.now() < quietUntil || !(await hasTabsPermission())) return;
  // 现读一次，分组、固定和是否正在看都按此刻的状态判断
  const tabs = await chrome.tabs.query({ windowType: "normal" });
  const tab = tabs.find((t) => t.id === tabId);
  if (!tab) return; // 已经关了，或者在 PWA、弹出窗口里
  // 窗口里只有它时关掉会连窗口一起关，按 ⌘N 打开的主页就是这样，留着
  if (!tabs.some((t) => t.windowId === tab.windowId && t.id !== tab.id)) return;
  const copy = findOpenCopy(tabs, tab);
  if (!copy) return;
  // 先切过去再关，浏览器就不会在中间切到旁边的标签页
  if (tab.active) {
    await chrome.tabs.update(copy.id, { active: true });
    if (copy.windowId !== tab.windowId) await chrome.windows.update(copy.windowId, { focused: true });
  }
  await chrome.tabs.remove(tab.id);
}

chrome.tabs.onCreated.addListener((tab) => {
  if (Date.now() < quietUntil) return;
  freshTabs.set(tab.id, 0);
  saveFreshTabs();
});

chrome.tabs.onRemoved.addListener((tabId) => {
  if (freshTabs.delete(tabId)) saveFreshTabs();
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  const isPage = /^https?:/.test(changeInfo.url || tab.url || "");
  if (changeInfo.url && isPage) {
    enqueue(async () => {
      await freshTabsReady;
      if (isFresh(tabId)) await switchToOpenCopy(tabId);
    });
  }
  if (changeInfo.status === "complete") {
    if (isPage) {
      enqueue(async () => {
        await freshTabsReady;
        if (freshTabs.get(tabId) === 0) {
          freshTabs.set(tabId, Date.now());
          saveFreshTabs();
        }
      });
    }
    scheduleSweep();
  }
});

chrome.permissions.onAdded.addListener(scheduleSweep);

async function init() {
  const mode = await getStoredMode();
  await applyMode(mode);
}

chrome.runtime.onInstalled.addListener(init);
chrome.runtime.onStartup.addListener(init);

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || message.type !== "MAPLE_SET_MODE") {
    return false;
  }

  const nextMode = message.mode === MODE_SIDEBAR ? MODE_SIDEBAR : MODE_POPUP;

  (async () => {
    await chrome.storage.local.set({ [MODE_KEY]: nextMode });
    await applyMode(nextMode);

    if (message.openImmediately) {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      if (nextMode === MODE_SIDEBAR) {
        try {
          if (chrome.sidePanel?.open && tab) {
            await chrome.sidePanel.open({ windowId: tab.windowId });
          } else {
            const sidebarApi = globalThis.browser?.sidebarAction;
            if (sidebarApi?.open) {
              await sidebarApi.open();
            }
          }
        } catch (e) {
          console.warn("Failed to open side panel:", e);
        }
      } else if (nextMode === MODE_POPUP) {
        // Sidebar -> popup geçişi: önce action.openPopup dene (Chrome 127+),
        // başarısız olursa standalone popup penceresi aç (her Chrome sürümünde çalışır).
        let opened = false;
        try {
          if (chrome.action?.openPopup) {
            await chrome.action.openPopup();
            opened = true;
          }
        } catch (e) {
          console.warn("chrome.action.openPopup failed, falling back:", e);
        }

        if (!opened) {
          try {
            const w = tab ? await chrome.windows.get(tab.windowId) : null;
            const popupWidth = 420;
            const popupHeight = 540;
            const left = w ? Math.max(0, (w.left || 0) + (w.width || 800) - popupWidth - 24) : undefined;
            const top = w ? (w.top || 0) + 80 : undefined;
            await chrome.windows.create({
              url: chrome.runtime.getURL("popup.html"),
              type: "popup",
              width: popupWidth,
              height: popupHeight,
              focused: true,
              ...(left !== undefined ? { left } : {}),
              ...(top !== undefined ? { top } : {}),
            });
          } catch (e) {
            console.warn("Failed to open popup window fallback:", e);
          }
        }

        // Firefox sidebar'ı için açıkça kapat
        try {
          const sidebarApi = globalThis.browser?.sidebarAction;
          if (sidebarApi?.close) {
            await sidebarApi.close();
          }
        } catch (e) {
          console.warn("Failed to close Firefox sidebar:", e);
        }
      }
    }

    sendResponse({ ok: true, mode: nextMode });
  })();

  return true;
});
