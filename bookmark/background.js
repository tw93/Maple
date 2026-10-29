// Service worker that keeps popup and sidebar modes mutually exclusive.
// Mode is persisted in chrome.storage.local so it survives browser restarts.

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
