import { debounce } from "./utils/debounce.js";
import { keyText, BestMatchTitle, LastBestMatch, BestMatch, EmptyBookmarkMessage } from "./utils/i18n.js";
import { Notification } from "./utils/notification.js";
import { createElement } from "./utils/element.js";
import { getFavicon } from "./utils/favicon.js";
import { getShortName } from "./utils/short-name.js";
import { loadNotes, getNote, saveNote, getFolderNote, saveFolderNote, onNotesChanged } from "./utils/notes.js";
import { ICONS } from "./utils/icons.js";
import { getCategoryIcon } from "./utils/category-icons.js";
import { enableDragSort } from "./utils/drag-sort.js";
import { createNoteTooltip, createNoteEditor } from "./utils/note-ui.js";
import { createSitePreview, clearPreviews, countPreviews } from "./utils/site-preview.js";

// 设置相关常量
const SETTINGS_KEYS = {
  SEARCH_ENABLED: "MAPLE_SEARCH_ENABLED",
  TIPS_ENABLED: "MAPLE_TIPS_ENABLED",
  OPEN_IN_NEW_TAB: "MAPLE_OPEN_IN_NEW_TAB",
  KEEP_PANEL_OPEN: "MAPLE_KEEP_PANEL_OPEN",
  SHORT_NAMES: "MAPLE_SHORT_NAMES",
};

const FIXED_POPUP_WIDTH = 408;
const FIXED_POPUP_HEIGHT = 520;
// MV3 CSP inline script'leri engelliyor; modu URL pathname'den tespit ediyoruz
const IS_SIDEBAR_MODE = typeof location !== "undefined" && /sidebar\.html$/.test(location.pathname || "");

function applyFixedPopupSize() {
  if (IS_SIDEBAR_MODE) return;
  document.documentElement.style.width = `${FIXED_POPUP_WIDTH}px`;
  document.documentElement.style.minWidth = `${FIXED_POPUP_WIDTH}px`;
  document.documentElement.style.maxWidth = `${FIXED_POPUP_WIDTH}px`;
  document.documentElement.style.height = `${FIXED_POPUP_HEIGHT}px`;
  document.documentElement.style.minHeight = `${FIXED_POPUP_HEIGHT}px`;
  document.documentElement.style.maxHeight = `${FIXED_POPUP_HEIGHT}px`;

  if (document.body) {
    document.body.style.width = `${FIXED_POPUP_WIDTH}px`;
    document.body.style.minWidth = `${FIXED_POPUP_WIDTH}px`;
    document.body.style.maxWidth = `${FIXED_POPUP_WIDTH}px`;
    document.body.style.height = `${FIXED_POPUP_HEIGHT}px`;
    document.body.style.minHeight = `${FIXED_POPUP_HEIGHT}px`;
    document.body.style.maxHeight = `${FIXED_POPUP_HEIGHT}px`;
  }
}

applyFixedPopupSize();

// 获取搜索功能开启状态
function isSearchEnabled() {
  return localStorage.getItem(SETTINGS_KEYS.SEARCH_ENABLED) === "true";
}

// 获取 tips 功能开启状态
function isTipsEnabled() {
  return localStorage.getItem(SETTINGS_KEYS.TIPS_ENABLED) === "true";
}

// 获取是否在新标签页打开
function isOpenInNewTabEnabled() {
  return localStorage.getItem(SETTINGS_KEYS.OPEN_IN_NEW_TAB) !== "false";
}

// 获取点击书签后是否保持面板打开
function isKeepPanelOpenEnabled() {
  return localStorage.getItem(SETTINGS_KEYS.KEEP_PANEL_OPEN) === "true";
}

// Cards show only the site name ("youtube") unless this is turned off
function isShortNamesEnabled() {
  return localStorage.getItem(SETTINGS_KEYS.SHORT_NAMES) !== "false";
}

// Some bookmarks cannot be opened by an extension, for example javascript:
// bookmarklets or file:// pages without file access. Say so instead of failing silently.
function reportOpenError(error) {
  console.warn("Failed to open bookmark:", error);
  Notification.show(TEXT.cannotOpen, 1800);
}

function createTab(url, active = true) {
  const api = typeof browser !== "undefined" ? browser : chrome;
  Promise.resolve(api.tabs.create({ url, active })).catch(reportOpenError);
}

function updateCurrentTab(url) {
  const api = typeof browser !== "undefined" ? browser : chrome;
  Promise.resolve(api.tabs.update({ url })).catch(reportOpenError);
}

const CLASS_NAMES = {
  bookmark: "bookmark",
  favicon: "favicon",
  folder: "folder",
  childContainer: "childContainer",
  Notification: "Notification",
  folderTitle: "folderTitle",
};

const isZhUI = navigator.language.startsWith("zh");
const IS_FIREFOX = navigator.userAgent.includes("Firefox");

// Whether the optional "tabs" permission is granted. Firefox accepts
// permissions.request() only synchronously inside a click, so it must be known up front.
let hasTabsPermission = false;
try {
  chrome.permissions?.contains({ permissions: ["tabs"] }).then(
    (granted) => {
      hasTabsPermission = granted;
    },
    () => {}
  );
  chrome.permissions?.onAdded?.addListener((permissions) => {
    if (permissions.permissions?.includes("tabs")) hasTabsPermission = true;
  });
  chrome.permissions?.onRemoved?.addListener((permissions) => {
    if (permissions.permissions?.includes("tabs")) hasTabsPermission = false;
  });
} catch {
  // permissions API not available
}

const TEXT = isZhUI
  ? {
      settings: "设置",
      addTitle: "添加当前页面",
      added: "已添加，拖到文件夹即可归类",
      alreadySaved: "此页面已在书签中",
      cannotAdd: "此页面无法添加为书签",
      cannotOpen: "无法在此打开该书签",
      failed: "操作失败，请重试",
      deleted: (name) => `已删除 ${name}`,
      undo: "撤销",
      toSidebar: "切换到侧边栏模式",
      toPopup: "切换到弹窗模式",
      newCategory: "新建分类",
      categoryName: "分类名称",
      collapseAll: "全部收起",
      expandAll: "全部展开",
      dropHint: "拖动卡片到这里",
      editCategory: "重命名或删除",
      deleteCategory: "删除分类",
      deletedCategory: (name, count) => `已删除 ${name}（${count} 个书签）`,
      sites: (count) => `${count} 个网站`,
      emptyCategory: "暂无书签",
      descriptionPlaceholder: "描述（可选）",
    }
  : {
      settings: "Settings",
      addTitle: "Add current page",
      added: "Added. Drag it into a folder.",
      alreadySaved: "This page is already saved",
      cannotAdd: "This page cannot be bookmarked",
      cannotOpen: "This bookmark cannot be opened from here",
      failed: "Something went wrong. Try again.",
      deleted: (name) => `Deleted ${name}`,
      undo: "Undo",
      toSidebar: "Switch to sidebar",
      toPopup: "Switch to popup",
      newCategory: "New category",
      categoryName: "Category name",
      collapseAll: "Collapse all",
      expandAll: "Expand all",
      dropHint: "Drop cards here",
      editCategory: "Rename or delete",
      deleteCategory: "Delete category",
      deletedCategory: (name, count) => `Deleted ${name} and ${count} bookmark${count === 1 ? "" : "s"}`,
      sites: (count) => `${count} site${count === 1 ? "" : "s"}`,
      emptyCategory: "No bookmarks yet",
      descriptionPlaceholder: "Description (optional)",
    };

let folderCount;
// Latest bookmark tree, for re-renders that do not need a new fetch
let latestTree = null;
// A bookmark to scroll to and highlight after the next render (added or restored)
let pendingRevealId = null;
// The same for a folder (a new category)
let pendingRevealFolderId = null;

const searchInput = document.getElementById("searchInput");
const hotArea = document.querySelector("#hot-area");
const settingsBtn = document.getElementById("settingsBtn");
const settingsWrapper = document.querySelector(".settings-wrapper");
const modeBtn = document.getElementById("modeBtn");
const addBtn = document.getElementById("addBtn");
const newFolderBtn = document.getElementById("newFolderBtn");
const collapseBtn = document.getElementById("collapseBtn");
const bottomBar = document.querySelector(".bottom-bar");
const bookmarksRoot = document.getElementById("bookmarks");
const bestMatchRoot = document.getElementById("best-match");

let activeBestMatchIndex = 0;
let hideTimeout = null;
// Search açıkken hem popup hem sidebar'da hep görünür olsun
let searchIsHide = !isSearchEnabled();

let bestMatches = [];
// 延迟恢复 header 元素，避免阻塞初始渲染
setTimeout(() => {
  if (isSearchEnabled()) {
    const persistedHeader = localStorage.getItem("persistedHeader");
    if (persistedHeader) {
      try {
        updateHeader(JSON.parse(persistedHeader), true);
        updateActiveBestMatch(activeBestMatchIndex);
      } catch {
        // 忽略解析错误
      }
    }
  }
}, 0);

const noteTooltip = createNoteTooltip();
const sitePreview = createSitePreview();

// Page previews (opt-in): background.js saves the screenshots and share images,
// this page shows them
const PREVIEWS_KEY = "MAPLE_PREVIEWS";
const ALL_URLS = { origins: ["<all_urls>"] };
let previewsOn = false;
chrome.storage.local.get(PREVIEWS_KEY).then(
  (result) => {
    previewsOn = result[PREVIEWS_KEY] === true;
    watchPreviews();
  },
  () => {}
);
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local" || !changes[PREVIEWS_KEY]) return;
  previewsOn = changes[PREVIEWS_KEY].newValue === true;
  if (previewsOn) watchPreviews();
  else sitePreview.forget();
});
// The permission can arrive after the setting turned on
chrome.permissions?.onAdded?.addListener(() => watchPreviews());

// Cards on screen get their preview ready before a hover (needs the permission too)
function watchPreviews() {
  if (!previewsOn) return;
  chrome.permissions.contains(ALL_URLS).then(
    (granted) => {
      if (granted && previewsOn) sitePreview.watch(bookmarksRoot.querySelectorAll(".bookmark"));
    },
    () => {}
  );
}
const noteEditor = createNoteEditor({ getNote, saveNote, onDelete: deleteBookmark });

// Settings overlay: pop-up + sidebar içinde overlay olarak ayarlar paneli
const SETTINGS_OVERLAY = {
  el: null,
  bookmarksEl: null,
  init() {
    this.el = document.getElementById("settings-overlay");
    this.bookmarksEl = document.getElementById("bookmarks");
    if (!this.el) return;

    // i18n metinler
    const i18n = isZhUI
      ? {
          title: "设置",
          back: "返回",
          "display-mode-title": "显示模式（侧边栏）",
          "display-mode-desc": "开启后点击图标打开侧边栏，关闭后打开弹窗。",
          "search-title": "搜索",
          "search-desc": "显示搜索框以快速查找书签。",
          "short-title": "简短名称",
          "short-desc": "只显示网站名称（如 youtube），不显示完整网页标题。",
          "previews-title": "网页预览",
          "previews-desc":
            "鼠标悬停卡片即可预览网站。打开已收藏的网站时，会在本机保存一张小截图。在此之前，卡片显示网站的分享图（不带 Cookie 下载一次）。",
          previewsStatus: (shots, images) => `已保存 ${shots} 张截图、${images} 张分享图。`,
          previewsEmpty: "还没有预览。打开一个已收藏的网站，或把鼠标移到卡片上。",
          previewsError: (message) => `截图失败：${message}`,
          "tips-title": "悬停提示",
          "tips-desc": "鼠标悬停时显示完整书签标题。",
          "newtab-title": "新标签页打开",
          "newtab-desc": "在新标签页打开书签，关闭则在当前标签页。",
          "keep-title": "保持面板",
          "keep-desc": "在后台标签页打开，让面板保持可见。",
        }
      : {
          title: "Settings",
          back: "Back",
          "display-mode-title": "Display Mode (Sidebar)",
          "display-mode-desc": "When on, clicking the icon opens the sidebar; when off, it opens the popup.",
          "search-title": "Search",
          "search-desc": "Show search box to quickly find bookmarks.",
          "short-title": "Short Names",
          "short-desc": "Show only the site name, like youtube, instead of the full page title.",
          "previews-title": "Page Previews",
          "previews-desc":
            "Hover a card to see the site. Opening a bookmarked site saves a small screenshot on this device. Until then, the card shows the site's share image, downloaded once without cookies.",
          previewsStatus: (shots, images) =>
            `Saved: ${shots} screenshot${shots === 1 ? "" : "s"}, ${images} share image${images === 1 ? "" : "s"}.`,
          previewsEmpty: "No previews yet. Open a bookmarked site, or hover a card.",
          previewsError: (message) => `Screenshot failed: ${message}`,
          "tips-title": "Hover Tooltips",
          "tips-desc": "Show full bookmark titles on hover.",
          "newtab-title": "Open in New Tab",
          "newtab-desc": "Open bookmarks in a new tab vs the current one.",
          "keep-title": "Keep Panel Open",
          "keep-desc": "Open in background tabs to keep the panel visible.",
        };
    this.i18n = i18n;
    const titleEl = document.getElementById("settingsOverlayTitle");
    if (titleEl) titleEl.textContent = i18n.title;
    const backEl = document.getElementById("settingsOverlayBack");
    if (backEl) backEl.setAttribute("aria-label", i18n.back);
    this.el.querySelectorAll("[data-setting-key]").forEach((node) => {
      const key = node.getAttribute("data-setting-key");
      if (i18n[key]) node.textContent = i18n[key];
    });

    if (backEl) backEl.addEventListener("click", () => this.close());

    const sidebar = document.getElementById("overlaySidebarMode");
    const search = document.getElementById("overlaySearchEnabled");
    const shortNames = document.getElementById("overlayShortNames");
    const previews = document.getElementById("overlayPreviews");
    const tips = document.getElementById("overlayTipsEnabled");
    const newtab = document.getElementById("overlayOpenInNewTab");
    const keep = document.getElementById("overlayKeepPanelOpen");

    if (sidebar) {
      sidebar.addEventListener("change", () => {
        // Eğer hedef zaten mevcut moddaysa hiçbir şey yapma
        if (sidebar.checked === IS_SIDEBAR_MODE) return;
        // Same flow as the mode button. This still runs inside the user's click.
        switchDisplayMode();
      });
    }
    if (search) {
      search.addEventListener("change", () => {
        localStorage.setItem(SETTINGS_KEYS.SEARCH_ENABLED, search.checked.toString());
        location.reload();
      });
    }
    if (shortNames) {
      shortNames.addEventListener("change", () => {
        localStorage.setItem(SETTINGS_KEYS.SHORT_NAMES, shortNames.checked.toString());
        if (latestTree) renderBookmarkTree(latestTree);
      });
    }
    if (previews) {
      previews.addEventListener("change", () => {
        if (previews.checked) {
          // The permission prompt needs this click, so ask before any await. The
          // setting is saved first: a popup can close while the prompt is open.
          const request = chrome.permissions.request(ALL_URLS);
          chrome.storage.local.set({ [PREVIEWS_KEY]: true });
          const turnOff = () => {
            previews.checked = false;
            chrome.storage.local.set({ [PREVIEWS_KEY]: false });
          };
          request.then((granted) => (granted ? setTimeout(() => this.showPreviewStatus(), 2500) : turnOff()), turnOff);
        } else {
          // Off removes the saved screenshots and gives the permission back
          chrome.storage.local.set({ [PREVIEWS_KEY]: false });
          clearPreviews().then(() => sitePreview.forget());
          this.showPreviewStatus();
          chrome.permissions.remove(ALL_URLS).catch(() => {});
        }
      });
    }
    if (tips) {
      tips.addEventListener("change", () => {
        localStorage.setItem(SETTINGS_KEYS.TIPS_ENABLED, tips.checked.toString());
      });
    }
    if (newtab) {
      newtab.addEventListener("change", () => {
        localStorage.setItem(SETTINGS_KEYS.OPEN_IN_NEW_TAB, newtab.checked.toString());
      });
    }
    if (keep) {
      keep.addEventListener("change", () => {
        localStorage.setItem(SETTINGS_KEYS.KEEP_PANEL_OPEN, keep.checked.toString());
      });
    }

    // ESC ile kapat
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.el && !this.el.hidden && this.el.classList.contains("open")) {
        e.preventDefault();
        this.close();
      }
    });
  },
  open() {
    if (!this.el) return;
    // Mevcut değerleri yükle
    const search = document.getElementById("overlaySearchEnabled");
    const shortNames = document.getElementById("overlayShortNames");
    const tips = document.getElementById("overlayTipsEnabled");
    const newtab = document.getElementById("overlayOpenInNewTab");
    const keep = document.getElementById("overlayKeepPanelOpen");
    const sidebar = document.getElementById("overlaySidebarMode");

    if (search) search.checked = localStorage.getItem(SETTINGS_KEYS.SEARCH_ENABLED) === "true";
    if (shortNames) shortNames.checked = isShortNamesEnabled();
    const previews = document.getElementById("overlayPreviews");
    if (previews) {
      previews.checked = false;
      Promise.all([chrome.storage.local.get(PREVIEWS_KEY), chrome.permissions.contains(ALL_URLS)]).then(
        ([result, granted]) => {
          previews.checked = result[PREVIEWS_KEY] === true && granted;
          this.showPreviewStatus();
        },
        () => {}
      );
    }
    if (tips) tips.checked = localStorage.getItem(SETTINGS_KEYS.TIPS_ENABLED) === "true";
    if (newtab) newtab.checked = localStorage.getItem(SETTINGS_KEYS.OPEN_IN_NEW_TAB) !== "false";
    if (keep) keep.checked = localStorage.getItem(SETTINGS_KEYS.KEEP_PANEL_OPEN) === "true";
    if (sidebar) {
      sidebar.checked = IS_SIDEBAR_MODE;
      try {
        chrome.storage?.local?.get?.("MAPLE_DISPLAY_MODE", (result) => {
          if (result && typeof result.MAPLE_DISPLAY_MODE !== "undefined") {
            sidebar.checked = result.MAPLE_DISPLAY_MODE === "sidebar";
          }
        });
      } catch {
        // ignore
      }
    }

    this.el.hidden = false;
    requestAnimationFrame(() => {
      if (this.el) this.el.classList.add("open");
    });
  },
  // Under "Page Previews": how many sites have a preview, and the last screenshot error
  async showPreviewStatus() {
    const status = document.getElementById("previewsStatus");
    const previews = document.getElementById("overlayPreviews");
    if (!status || !this.i18n) return;
    if (!previews?.checked) {
      status.textContent = "";
      return;
    }
    const [{ screenshots, shareImages }, stored] = await Promise.all([
      countPreviews(),
      chrome.storage.local.get("MAPLE_PREVIEW_ERROR").catch(() => ({})),
    ]);
    const lines = [
      screenshots || shareImages ? this.i18n.previewsStatus(screenshots, shareImages) : this.i18n.previewsEmpty,
    ];
    if (stored.MAPLE_PREVIEW_ERROR) lines.push(this.i18n.previewsError(stored.MAPLE_PREVIEW_ERROR));
    status.textContent = lines.join(" ");
  },
  close() {
    if (!this.el) return;
    this.el.classList.remove("open");
    setTimeout(() => {
      if (this.el && !this.el.classList.contains("open")) this.el.hidden = true;
    }, 280);
  },
};
SETTINGS_OVERLAY.init();

// Settings butonu artık ayrı bir sayfa açmıyor — overlay'i açıyor
if (settingsBtn) {
  settingsBtn.innerHTML = ICONS.settings;
  settingsBtn.title = TEXT.settings;
  settingsBtn.setAttribute("aria-label", TEXT.settings);

  settingsBtn.addEventListener("click", function (e) {
    e.preventDefault();
    e.stopPropagation();
    SETTINGS_OVERLAY.open();
  });
} else {
  console.error("Settings button not found");
}

if (newFolderBtn) {
  newFolderBtn.innerHTML = ICONS.folderPlus;
  newFolderBtn.title = TEXT.newCategory;
  newFolderBtn.setAttribute("aria-label", TEXT.newCategory);
  newFolderBtn.addEventListener("click", function (e) {
    e.preventDefault();
    startNewCategory();
  });
}

// One button: "Collapse all" while any folder is open, else "Expand all"
if (collapseBtn) {
  collapseBtn.addEventListener("click", function (e) {
    e.preventDefault();
    setAllFoldersCollapsed(Boolean(bookmarksRoot.querySelector(".folderTitle.collapsible-folder.expanded")));
  });
}

if (addBtn) {
  addBtn.innerHTML = ICONS.plus;
  addBtn.title = TEXT.addTitle;
  addBtn.setAttribute("aria-label", TEXT.addTitle);
  addBtn.addEventListener("click", function (e) {
    e.preventDefault();
    // Firefox: ask for "tabs" right here in the click, before any await
    const firefoxPermission =
      IS_FIREFOX && !hasTabsPermission ? chrome.permissions.request({ permissions: ["tabs"] }) : null;
    addCurrentPage(firefoxPermission);
  });
}

// 监听显示模式变化：如果当前面板与新模式不一致，则自动关闭，避免 popup 与 sidebar 同时显示
if (typeof chrome !== "undefined" && chrome.storage?.onChanged) {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local" || !changes.MAPLE_DISPLAY_MODE) return;
    // The page that drives a switch closes itself after the other view is open
    if (isSwitchingMode) return;
    const newMode = changes.MAPLE_DISPLAY_MODE.newValue;
    const currentIsSidebar = IS_SIDEBAR_MODE;
    const newIsSidebar = newMode === "sidebar";
    if (currentIsSidebar !== newIsSidebar) {
      window.close();
    }
  });
}

// 模式切换按钮：在 popup 与 sidebar 之间切换，确保两者不会同时存在
if (modeBtn) {
  modeBtn.title = IS_SIDEBAR_MODE ? TEXT.toPopup : TEXT.toSidebar;
  modeBtn.setAttribute("aria-label", modeBtn.title);
  // Sidebar moddayken popup-benzeri ikon (hedef = popup), popup moddayken sidebar-benzeri ikon
  modeBtn.innerHTML = IS_SIDEBAR_MODE ? ICONS.popup : ICONS.sidebar;

  modeBtn.addEventListener("click", function (e) {
    e.preventDefault();
    e.stopPropagation();
    switchDisplayMode();
  });
}

// Mode switch: the page that is open now opens the other view first and closes
// itself only after that, so there is no moment with nothing on screen.
const MODE_POPUP = "popup";
const MODE_SIDEBAR = "sidebar";
// How long a page stays open to show the notice when the other view cannot open
const MODE_NOTICE_MS = 2000;
const MODE_NOTICE_TEXT = isZhUI
  ? { sidebar: "已切换到侧边栏，点击图标打开", popup: "已切换到弹窗，点击图标打开" }
  : {
      sidebar: "Sidebar mode is on. Click the icon to open it.",
      popup: "Popup mode is on. Click the icon to open it.",
    };

let isSwitchingMode = false;

// The window of this page, so the other view opens in the same window
let currentWindowId = null;
try {
  chrome.windows.getCurrent((win) => {
    void chrome.runtime.lastError;
    currentWindowId = win?.id ?? null;
  });
} catch {
  // ignore
}

// Cmd/Ctrl+B (see background.js): a sidebar that is already open closes itself
if (IS_SIDEBAR_MODE && chrome.runtime?.onMessage) {
  chrome.runtime.onMessage.addListener((message) => {
    if (message?.type === "MAPLE_TOGGLE_SIDEBAR" && message.windowId === currentWindowId) {
      window.close();
    }
  });
}

function sendDisplayMode(mode, extra = {}) {
  return new Promise((resolve) => {
    try {
      chrome.runtime.sendMessage({ type: "MAPLE_SET_MODE", mode, ...extra }, (response) => {
        void chrome.runtime.lastError;
        resolve(response || null);
      });
    } catch {
      resolve(null);
    }
  });
}

function finishModeSwitch(opened, notice) {
  if (opened) {
    window.close();
    return;
  }
  // The other view did not open: tell the user how to open it, then close
  Notification.show(notice, MODE_NOTICE_MS);
  setTimeout(() => window.close(), MODE_NOTICE_MS);
}

async function switchToSidebar() {
  // Firefox opens a sidebar only inside the click handler, so before any await
  const firefoxSidebar = chrome.sidePanel ? null : globalThis.browser?.sidebarAction;
  const firefoxOpening = firefoxSidebar?.open
    ? firefoxSidebar.open().then(
        () => true,
        () => false
      )
    : null;

  // Wait for the background, so it gets the message before this popup closes
  await sendDisplayMode(MODE_SIDEBAR);

  let opened = false;
  if (firefoxOpening) {
    opened = await firefoxOpening;
  } else if (chrome.sidePanel?.open) {
    // sidePanel.open() needs a user gesture. This page keeps the click's
    // activation for a few seconds, the background worker does not get it.
    try {
      await chrome.sidePanel.open({ windowId: currentWindowId ?? chrome.windows.WINDOW_ID_CURRENT });
      opened = true;
    } catch (error) {
      console.warn("Failed to open side panel:", error);
    }
  }
  finishModeSwitch(opened, MODE_NOTICE_TEXT.sidebar);
}

async function switchToPopup() {
  // The background sets popup.html as the action popup and then opens it
  const switching = sendDisplayMode(MODE_POPUP, { openPopup: true, windowId: currentWindowId });

  // Firefox closes a sidebar only inside the click handler, so close it now
  const firefoxSidebar = chrome.sidePanel ? null : globalThis.browser?.sidebarAction;
  if (firefoxSidebar?.close) {
    firefoxSidebar.close().catch(() => window.close());
    return;
  }

  const response = await switching;
  finishModeSwitch(Boolean(response?.opened), MODE_NOTICE_TEXT.popup);
}

function switchDisplayMode() {
  if (isSwitchingMode) return;
  isSwitchingMode = true;
  if (IS_SIDEBAR_MODE) {
    switchToPopup();
  } else {
    switchToSidebar();
  }
}

// 更新搜索功能显示状态
function updateSearchFeatureVisibility() {
  const searchWrapper = document.querySelector("#search-wrapper");

  if (!isSearchEnabled()) {
    // 搜索功能关闭时，完全隐藏搜索相关元素
    searchWrapper.style.display = "none";
    hotArea.style.display = "none";
    // 清空最佳匹配
    if (bestMatchRoot) {
      bestMatchRoot.innerHTML = "";
    }
  } else {
    // 搜索功能开启时，恢复正常显示
    searchWrapper.style.display = "block";
    hotArea.style.display = searchIsHide ? "block" : "none";
  }
}

function showLoadingState() {
  if (!bookmarksRoot) {
    return;
  }
  if (bookmarksRoot.children.length > 0) {
    return;
  }
  const loadingState = createElement("div", "loading-state", "");
  loadingState.dataset.loading = "true";
  loadingState.setAttribute("aria-label", isZhUI ? "书签加载中" : "Loading bookmarks");

  const loadingTitle = createElement("div", "loading-title", "");
  const loadingGrid = createElement("div", "loading-grid", "");

  for (let i = 0; i < 9; i++) {
    loadingGrid.appendChild(createElement("div", "loading-card", ""));
  }

  loadingState.appendChild(loadingTitle);
  loadingState.appendChild(loadingGrid);
  bookmarksRoot.appendChild(loadingState);
}

// Bookmark / Fuse cache: search input'unun her keystroke'unda yeniden inşa etmemek için
const FUSE_OPTIONS = {
  keys: ["title", "url"],
  ignoreLocation: false,
  includeScore: true,
  threshold: 0.5,
  shouldSort: true,
};
let _bookmarkCache = null;
let _fuseInstance = null;
// Fuse is only needed for search, which is off by default, so it loads on first use
let _fuseModule = null;

function invalidateBookmarkCache() {
  _bookmarkCache = null;
  _fuseInstance = null;
}

function getBookmarkCache() {
  if (_bookmarkCache) return _bookmarkCache;
  // Sadece #bookmarks ağacını cache'le; #best-match (search sonuçları) hariç
  if (!bookmarksRoot) {
    _bookmarkCache = { folders: [], items: [] };
    return _bookmarkCache;
  }
  const folderEls = Array.from(bookmarksRoot.getElementsByClassName(CLASS_NAMES.folder));
  const items = [];
  for (const el of bookmarksRoot.getElementsByClassName(CLASS_NAMES.bookmark)) {
    // Ata folder zincirini önceden hesapla (closest-first)
    const ancestors = [];
    let p = el.parentElement;
    while (p && p !== bookmarksRoot) {
      if (p.classList?.contains(CLASS_NAMES.folder)) ancestors.push(p);
      p = p.parentElement;
    }
    // Search the full page title, not only the short name on the card
    const title = el.dataset.title || el.textContent;
    const url = el.href;
    items.push({
      el,
      ancestors,
      id: el.dataset.id,
      title,
      titleLower: title.toLowerCase(),
      url,
      urlLower: url.toLowerCase(),
    });
  }
  _bookmarkCache = { folders: folderEls, items };
  return _bookmarkCache;
}

async function getFuseInstance() {
  if (_fuseInstance) return _fuseInstance;
  _fuseModule ??= import("./lib/fuse.js").then((module) => module.default);
  const Fuse = await _fuseModule;
  _fuseInstance ??= new Fuse(getBookmarkCache().items, FUSE_OPTIONS);
  return _fuseInstance;
}

/**
 * @description 快速切换默认选中的最佳结果
 * @param index {number} 要选中的索引
 */
function updateActiveBestMatch(index) {
  const bestMatch = Array.from(document.querySelectorAll("#best-match .bookmark"));
  if (bestMatch.length === 0) {
    return;
  }
  bestMatch.forEach((item) => item.classList.remove("active"));
  // 循环切换
  activeBestMatchIndex = index % bestMatch.length < 0 ? bestMatch.length - 1 : index % bestMatch.length;
  bestMatch[activeBestMatchIndex].classList.add("active");
}

/**
 * 获取当前选中的最佳匹配项
 * @returns {HTMLElement} 当前选中的最佳匹配项
 */
function getActiveBestMatch() {
  const bestMatch = Array.from(document.querySelectorAll("#best-match .bookmark"));
  return bestMatch[activeBestMatchIndex];
}

function showBestMatchTips() {
  if (!isTipsEnabled()) {
    return;
  }
  const curBestMathEle = getActiveBestMatch();
  if (!curBestMathEle || !bestMatches[activeBestMatchIndex]) {
    return;
  }
  const tipsCon = curBestMathEle.querySelector("p");
  if (tipsCon && checkOverflow(tipsCon)) {
    Notification.show(bestMatches[activeBestMatchIndex].title, 1500);
  }
}

/**
 * @description 更新 header 的内容，如果匹配失败则不更新
 * @param headerFuzeMatch {{ id?: string, title: string, url: string }[]|null} 匹配到的 对象数组 或 null
 * @param init {boolean} 是否是初始化
 */
function updateHeader(headerFuzeMatch, init = false) {
  if (!headerFuzeMatch) {
    return;
  }
  // 兼容旧版本，上一个版本 headerFuzeMatch 为单个对象
  if (!Array.isArray(headerFuzeMatch)) {
    headerFuzeMatch = Array.from(headerFuzeMatch);
  }
  const matchedBookmark = document.querySelector("#best-match .folder");
  if (matchedBookmark) {
    matchedBookmark.parentElement.removeChild(matchedBookmark);
  }
  const bestMatchFolder = createElement("div", CLASS_NAMES.folder);
  const childContainer = createElement("div", CLASS_NAMES.childContainer);

  // Header row: title + clear button
  const headerRow = createElement("div", "best-match-header");
  const title = createElement("h2", "", init ? LastBestMatch : BestMatch);
  title.title = BestMatchTitle;
  headerRow.appendChild(title);

  const clearBtn = createElement("button", "best-match-clear", "×");
  clearBtn.type = "button";
  clearBtn.setAttribute("aria-label", isZhUI ? "清除匹配" : "Clear matches");
  clearBtn.title = isZhUI ? "清除匹配" : "Clear matches";
  clearBtn.addEventListener("click", function (e) {
    e.preventDefault();
    e.stopPropagation();
    clearBestMatches();
  });
  headerRow.appendChild(clearBtn);

  headerFuzeMatch.forEach((matchedBookmark) => {
    createBookmarkItem(matchedBookmark, childContainer, { inBestMatch: true });
  });
  bestMatchFolder.appendChild(headerRow);
  bestMatchFolder.appendChild(childContainer);
  bestMatches = headerFuzeMatch;

  const persisted = headerFuzeMatch.map(({ id, title: matchTitle, url }) => ({ id, title: matchTitle, url }));
  localStorage.setItem("persistedHeader", JSON.stringify(persisted));
  bestMatchRoot.appendChild(bestMatchFolder);
  updateActiveBestMatch(0);
}

function clearBestMatches() {
  localStorage.removeItem("persistedHeader");
  if (bestMatchRoot) bestMatchRoot.innerHTML = "";
  bestMatches = [];
  activeBestMatchIndex = 0;
}

/**
 * 检测文本是否溢出
 * @param {HTMLElement} el 检测溢出的元素
 * @returns
 */
function checkOverflow(el) {
  const curOverflow = el.style.overflow;

  if (!curOverflow || curOverflow === "visible") el.style.overflow = "hidden";

  const isOverflowing = el.clientWidth < el.scrollWidth || el.clientHeight < el.scrollHeight;

  el.style.overflow = curOverflow;

  return isOverflowing;
}

// Search input: cached Fuse + tek geçişli filtreleme (her keystroke'ta tek Fuse search)
async function applySearch(rawTerm) {
  const searchTerm = rawTerm.toLowerCase().trim();
  // While searching, collapsed folders open so their matches are visible (see theme.css)
  document.body.classList.toggle("is-searching", Boolean(searchTerm));

  // Boş arama: her şeyi göster, header'ı temizle
  if (!searchTerm) {
    const { folders, items } = getBookmarkCache();
    for (const it of items) it.el.style.display = "";
    for (const folder of folders) folder.style.display = "";
    if (bestMatchRoot) bestMatchRoot.innerHTML = "";
    bestMatches = [];
    return;
  }

  const fuse = await getFuseInstance();
  // A newer keystroke runs its own search
  if (searchInput.value.toLowerCase().trim() !== searchTerm) return;
  const { folders, items } = getBookmarkCache();

  // Tek Fuse search; tüm sonuçları al, dedupe et
  const results = fuse.search(searchTerm);
  const matchedUrls = new Set();
  const orderedMatches = [];
  for (const r of results) {
    if (!matchedUrls.has(r.item.url)) {
      matchedUrls.add(r.item.url);
      orderedMatches.push(r.item);
    }
  }

  // Görünür bookmark'ı içeren tüm ata folder'ları işaretle (nested folders için)
  const visibleFolders = new Set();
  for (const it of items) {
    const visible = it.titleLower.includes(searchTerm) || it.urlLower.includes(searchTerm) || matchedUrls.has(it.url);
    it.el.style.display = visible ? "" : "none";
    if (visible) {
      for (const f of it.ancestors) visibleFolders.add(f);
    }
  }
  for (const folder of folders) {
    folder.style.display = visibleFolders.has(folder) ? "" : "none";
  }

  // Top 3 best-match header'da
  if (orderedMatches.length) {
    updateHeader(orderedMatches.slice(0, 3));
  } else {
    if (bestMatchRoot) bestMatchRoot.innerHTML = "";
    bestMatches = [];
  }
}

if (isSearchEnabled()) {
  searchInput.addEventListener(
    "input",
    debounce(function () {
      applySearch(searchInput.value);
    }, 80)
  );
}

// ---- Card actions: open, notes (info icon), delete, add, drag and drop ----

// Set at the start of each render, so localStorage is read once, not once per card
let renderShortNames = isShortNamesEnabled();

function getDisplayName(bookmarkNode, shortNames = renderShortNames) {
  const shortName = getShortName(bookmarkNode.url);
  if (shortNames && shortName) return shortName;
  return bookmarkNode.title || shortName || bookmarkNode.url;
}

function getCardFromEvent(event) {
  const card = event.target instanceof Element ? event.target.closest(".bookmark") : null;
  return card && (bookmarksRoot.contains(card) || bestMatchRoot?.contains(card)) ? card : null;
}

function getCardBookmark(card) {
  return {
    id: card.dataset.id,
    // The raw href attribute is the bookmark URL; notes are keyed by it
    url: card.getAttribute("href"),
    title: card.dataset.title,
    name: card.querySelector("p")?.textContent || "",
    favicon: card.querySelector(".favicon")?.src,
  };
}

function openBookmark(url, event) {
  // Shift: new window. Cmd/Ctrl, or "Keep Panel Open": background tab.
  if (event.shiftKey) {
    Promise.resolve(chrome.windows.create({ url })).catch(reportOpenError);
  } else if (event.metaKey || event.ctrlKey || isKeepPanelOpenEnabled()) {
    createTab(url, false);
  } else if (isOpenInNewTabEnabled()) {
    createTab(url);
  } else {
    updateCurrentTab(url);
  }
}

// Without urls: every card (after the notes load). With urls: only those cards.
function refreshNoteIcons(urls) {
  const cards = urls
    ? urls.flatMap((url) => [...document.querySelectorAll(`.bookmark[href="${CSS.escape(url)}"]`)])
    : document.querySelectorAll(".bookmark");
  for (const card of cards) {
    card.querySelector(".bookmark-info")?.classList.toggle("has-note", Boolean(getNote(card.getAttribute("href"))));
  }
}
onNotesChanged((urls, folderIds) => {
  if (urls.length) refreshNoteIcons(urls);
  // A category description changed: its second line is part of the render
  if (folderIds.length && latestTree && !isEditingCategory) renderBookmarkTree(latestTree);
});

// One listener for all cards, so a re-render does not add listeners
document.addEventListener("click", function (event) {
  const card = getCardFromEvent(event);
  if (!card || event.button !== 0) return;
  event.preventDefault();
  if (event.target.closest(".bookmark-info")) {
    noteTooltip.hide();
    noteEditor.open(getCardBookmark(card));
    return;
  }
  openBookmark(card.getAttribute("href"), event);
});

let hoveredCard = null;
document.addEventListener("mouseover", function (event) {
  const info = event.target instanceof Element ? event.target.closest(".bookmark-info") : null;
  if (info && !document.body.matches(".is-dragging-card, .is-dragging-folder")) {
    noteTooltip.show(info, getNote(info.closest(".bookmark").getAttribute("href")));
  }

  // The info icon has its own tooltip (the note)
  if (info) sitePreview.hide();

  const card = getCardFromEvent(event);
  if (card === hoveredCard) return;
  hoveredCard = card;
  if (card && previewsOn && !info && !document.body.matches(".is-dragging-card, .is-dragging-folder")) {
    sitePreview.show(card, card.getAttribute("href"));
  } else {
    sitePreview.hide();
  }
  // 只有在文本溢出且 tips 功能开启的时候才做处理
  if (!card || !isTipsEnabled()) return;
  const label = card.querySelector("p");
  if (label && checkOverflow(label)) {
    // 如果已经计划了隐藏通知的操作，取消它
    if (hideTimeout) {
      clearTimeout(hideTimeout);
      hideTimeout = null;
    }
    Notification.show(card.dataset.title || label.textContent);
  }
});

document.addEventListener("mouseout", function (event) {
  const target = event.target instanceof Element ? event.target : null;
  const next = event.relatedTarget instanceof Element ? event.relatedTarget : null;
  const info = target?.closest(".bookmark-info");
  if (info && !info.contains(next)) noteTooltip.hide();

  const card = target?.closest(".bookmark");
  if (!card || card.contains(next)) return;
  hoveredCard = null;
  sitePreview.hide();
  if (!isTipsEnabled()) return;
  if (hideTimeout) clearTimeout(hideTimeout);
  // 在mouseleave事件中，设置一个延时，然后隐藏Notification
  hideTimeout = setTimeout(() => {
    Notification.hide();
  }, 500);
});

document.addEventListener("mousedown", () => {
  noteTooltip.hide();
  sitePreview.hide();
});

// The toolbar stays on top (sticky); show its bottom line once the list scrolls
// The toolbar and the bottom menu show a thin line when the list continues behind them
function updateBarBorders() {
  const scroller = document.scrollingElement || document.documentElement;
  settingsWrapper?.classList.toggle("is-scrolled", scroller.scrollTop > 0);
  bottomBar?.classList.toggle("has-more", scroller.scrollTop + window.innerHeight < scroller.scrollHeight - 1);
}

window.addEventListener(
  "scroll",
  () => {
    noteTooltip.hide();
    sitePreview.hide();
    updateBarBorders();
  },
  { passive: true }
);
window.addEventListener("resize", updateBarBorders, { passive: true });

async function deleteBookmark(bookmark) {
  let node = null;
  try {
    if (bookmark.id) [node] = await chrome.bookmarks.get(bookmark.id);
  } catch {
    node = null;
  }
  try {
    // Cards restored from the last search may not have an id. With an id that no
    // longer exists, do not guess: another bookmark can have the same URL.
    if (!bookmark.id && bookmark.url) {
      node = (await chrome.bookmarks.search({ url: bookmark.url })).find((item) => item.url === bookmark.url) || null;
    }
    if (!node?.url) return;
    await chrome.bookmarks.remove(node.id);
  } catch (error) {
    console.warn("Failed to delete bookmark:", error);
    Notification.show(TEXT.failed, 1800);
    return;
  }
  // The note stays stored under the URL, so Undo brings it back as well.
  // Without Undo, the note goes too, unless another bookmark has the same URL.
  Notification.showAction(
    TEXT.deleted(getDisplayName(node)),
    TEXT.undo,
    () => {
      chrome.bookmarks
        .create({ parentId: node.parentId, index: node.index, title: node.title, url: node.url })
        .then((restored) => {
          pendingRevealId = restored.id;
        })
        .catch((error) => {
          console.warn("Failed to restore bookmark:", error);
          Notification.show(TEXT.failed, 1800);
        });
    },
    5000,
    () => removeOrphanNotes([node.url])
  );
}

// "+" in the toolbar: saves the active tab at the top of the list (bookmarks bar),
// from where the user drags it into a folder
async function getActiveTab() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return tab || null;
  } catch {
    return null;
  }
}

async function addCurrentPage(firefoxPermission = null) {
  if (firefoxPermission && !(await firefoxPermission.catch(() => false))) return;
  let tab = await getActiveTab();
  // Chrome hides the URL without the optional "tabs" permission, except for the tab
  // the extension was opened on (activeTab). Ask once; the click still allows the prompt.
  if (tab && !tab.url && !IS_FIREFOX && chrome.permissions?.request) {
    const granted = await chrome.permissions.request({ permissions: ["tabs"] }).catch(() => false);
    if (!granted) return;
    tab = await getActiveTab();
  }
  const url = tab?.url || "";
  if (!/^(https?|file):/i.test(url)) {
    Notification.show(TEXT.cannotAdd, 1800);
    return;
  }
  try {
    const existing = (await chrome.bookmarks.search({ url })).find((item) => item.url === url);
    if (existing) {
      revealBookmark(existing.id);
      Notification.show(TEXT.alreadySaved, 1600);
      return;
    }
    const tree = latestTree || (await fetchBookmarkTree());
    const parentId = tree?.[0]?.children?.[0]?.id ?? "1";
    const node = await chrome.bookmarks.create({ parentId, index: 0, title: tab.title || "", url });
    pendingRevealId = node.id;
    if (previewsOn && Number.isInteger(tab.id)) {
      chrome.runtime.sendMessage({ type: "MAPLE_CAPTURE_PREVIEW", tabId: tab.id }).catch(() => {});
    }
    Notification.show(TEXT.added, 2200);
  } catch (error) {
    console.warn("Failed to add bookmark:", error);
    Notification.show(TEXT.failed, 1800);
  }
}

// Scrolls to a card and flashes it; opens its collapsed folders first
function revealBookmark(id) {
  const card = bookmarksRoot.querySelector(`.bookmark[data-id="${CSS.escape(String(id))}"]`);
  if (!card) return;
  for (let el = card.parentElement; el && el !== bookmarksRoot; el = el.parentElement) {
    if (el.classList.contains(CLASS_NAMES.childContainer) && el.style.display === "none") {
      const folderTitle = el.parentElement.querySelector(":scope > .folderTitle");
      if (folderTitle) setFolderCollapsed(folderTitle, el, false);
    }
  }
  card.scrollIntoView({ block: "center", behavior: "smooth" });
  card.classList.remove("is-new");
  void card.offsetWidth;
  card.classList.add("is-new");
  card.addEventListener("animationend", () => card.classList.remove("is-new"), { once: true });
}

function moveBookmark(id, parentId, index, from) {
  if (!parentId) return;
  // Dropped where it was: nothing to move
  if (parentId === from.parentId && (index === from.index || index === from.index + 1)) return;
  chrome.bookmarks.move(id, index === undefined ? { parentId } : { parentId, index }).catch((error) => {
    console.warn("Failed to move bookmark:", error);
    Notification.show(TEXT.failed, 1800);
    scheduleRefresh();
  });
}

const dragSort = enableDragSort(bookmarksRoot, {
  canDrop: (container) =>
    Boolean(container?.dataset.folderId) && container.dataset.folderId !== "0" && container.dataset.locked !== "true",
  onMove: moveBookmark,
  onSpringOpen: (folderTitle) => {
    const container = folderTitle.parentElement.querySelector(":scope > .childContainer");
    if (container) setFolderCollapsed(folderTitle, container, false);
  },
  onEnd: () => {
    if (!refreshAfterDrag) return;
    refreshAfterDrag = false;
    refreshBookmarks();
  },
});

// A link dropped outside the card list (from a web page, the address bar, or a
// card released on the toolbar) must not navigate this page away from the extension.
document.addEventListener("dragover", (event) => {
  if (event.defaultPrevented) return; // the card list took it
  event.preventDefault();
  if (event.dataTransfer) event.dataTransfer.dropEffect = "none";
});
document.addEventListener("drop", (event) => event.preventDefault());

// Re-render when bookmarks change anywhere (this view, the other view, the
// browser's own bookmark UI). A render waits while a card is being dragged.
let refreshAfterDrag = false;
const scheduleRefresh = debounce(() => {
  if (dragSort.isDragging() || isEditingCategory) {
    refreshAfterDrag = true;
    return;
  }
  refreshBookmarks();
}, 50);

for (const eventName of ["onCreated", "onRemoved", "onChanged", "onMoved", "onChildrenReordered", "onImportEnded"]) {
  chrome.bookmarks?.[eventName]?.addListener(scheduleRefresh);
}

// The other view (popup or sidebar) changed a display setting
window.addEventListener("storage", (event) => {
  if (event.key === SETTINGS_KEYS.SHORT_NAMES && latestTree) renderBookmarkTree(latestTree);
});

window.addEventListener("keydown", function (event) {
  const target = event.target;
  // Typing in a field (note editor, settings) is not a list shortcut
  const isField =
    target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));
  if (noteEditor.isOpen() || (isField && target !== searchInput)) return;

  if (event.key === "Escape") {
    // 只在搜索功能开启时才处理清空搜索. With nothing to clear, Escape closes the popup as usual.
    if (isSearchEnabled() && (searchInput.value || bestMatches.length)) {
      event.preventDefault();
      searchInput.value = "";
      applySearch("");
    }
  }

  if (event.key === "ArrowLeft") {
    if (searchIsHide || !isSearchEnabled()) return;
    updateActiveBestMatch(activeBestMatchIndex - 1);
    showBestMatchTips();
  }

  if (event.key === "ArrowRight") {
    if (searchIsHide || !isSearchEnabled()) return;
    updateActiveBestMatch(activeBestMatchIndex + 1);
    showBestMatchTips();
  }

  // Enter opens the best match from the search box; elsewhere it must still
  // activate the focused card or button
  if (event.key === "Enter" && (target === searchInput || target === document.body)) {
    if (isSearchEnabled() && bestMatches.length !== 0) {
      event.preventDefault();
      openBookmark(bestMatches[activeBestMatchIndex].url, event);
    }
  }

  // Delete, or Cmd/Ctrl+Backspace (the Mac delete key), on a focused card deletes it
  // (with Undo). Plain Backspace does not: a clicked card keeps the focus.
  const isDeleteKey = event.key === "Delete" || (event.key === "Backspace" && (event.metaKey || event.ctrlKey));
  if (isDeleteKey && target instanceof Element) {
    const card = target.closest(".bookmark");
    if (card && bookmarksRoot.contains(card)) {
      event.preventDefault();
      deleteBookmark(getCardBookmark(card));
    }
  }

  if (event.ctrlKey && event.key === "s") {
    event.preventDefault();
    // Search bar her zaman görünür — Ctrl+S sadece odakla
    if (isSearchEnabled()) {
      searchInput?.focus();
    }
  }
});

function applySearchLayout(container, bookmarksContainer) {
  if (!container || !bookmarksContainer || !isSearchEnabled()) {
    return;
  }
  if (searchIsHide) {
    // -8 是因为有 8px 的 margin
    const searchBarContainerHeight = container.clientHeight - 8;
    bookmarksContainer.style.transform = `translateY(-${searchBarContainerHeight}px)`;
    hotArea.style.display = "block";
  } else {
    container.classList.add("show");
    bookmarksContainer.style.transform = `translateY(-8px)`;
    searchInput.focus();
    hotArea.style.display = "none";
  }
}

function renderBookmarkTree(bookmarkTreeNodes) {
  if (!bookmarkTreeNodes || !bookmarkTreeNodes.length) {
    return;
  }
  folderCount = countFolders(bookmarkTreeNodes[0].children || []);
  const scroller = document.scrollingElement || document.documentElement;
  const scrollTop = scroller.scrollTop;
  noteTooltip.hide();
  sitePreview.hide();
  hoveredCard = null;

  createBookmarks(bookmarkTreeNodes);
  scroller.scrollTop = scrollTop;

  if (isSearchEnabled() && searchInput.value.trim()) applySearch(searchInput.value);
  if (pendingRevealId) {
    revealBookmark(pendingRevealId);
    pendingRevealId = null;
  }
  if (pendingRevealFolderId) {
    revealFolder(pendingRevealFolderId);
    pendingRevealFolderId = null;
  }
  updateCollapseButton();
  updateBarBorders();
  updateFocusMode();
  watchPreviews();
}

async function fetchBookmarkTree() {
  if (typeof browser !== "undefined") {
    return await browser.bookmarks.getTree();
  }
  return await chrome.bookmarks.getTree();
}

async function refreshBookmarks() {
  try {
    latestTree = await fetchBookmarkTree();
    // A drag or a category edit may have started while the tree was loading
    if (dragSort.isDragging() || isEditingCategory) {
      refreshAfterDrag = true;
      return;
    }
    renderBookmarkTree(latestTree);
  } catch (error) {
    console.error("Failed to load bookmark tree:", error);
  }
}

async function initializePopup() {
  showLoadingState();

  try {
    const [bookmarkTreeNodes] = await Promise.all([fetchBookmarkTree(), loadNotes()]);
    latestTree = bookmarkTreeNodes;
    renderBookmarkTree(bookmarkTreeNodes);
    // Cards from the last search were drawn before the notes loaded
    refreshNoteIcons();
    updateSearchFeatureVisibility();
    applySearchLayout(document.querySelector("#search-wrapper"), bookmarksRoot);
    applyFixedPopupSize();
  } catch (error) {
    console.error("Failed to load bookmark tree:", error);
  } finally {
    document.body.classList.remove("popup-loading");
    requestAnimationFrame(() => {
      document.body.classList.add("popup-interactive");
    });
  }
}

// 在DOM ready时立即设置高度并初始化
document.addEventListener("DOMContentLoaded", function () {
  applyFixedPopupSize();
  initializePopup();
});

function createBookmarks(bookmarkTreeNodes) {
  bookmarksRoot.innerHTML = "";
  renderShortNames = isShortNamesEnabled();

  if (folderCount === 0) {
    showEmptyBookmarkMessage();
  } else {
    // DocumentFragment ile DOM'a tek seferde ekle (reflow azaltır)
    const fragment = document.createDocumentFragment();
    showBookmarks(bookmarkTreeNodes, fragment);
    bookmarksRoot.appendChild(fragment);
  }
  // Bookmark DOM'u değişti; arama cache'ini geçersiz kıl
  invalidateBookmarkCache();
}

function showEmptyBookmarkMessage() {
  const messageElement = createElement("p", "message", EmptyBookmarkMessage);
  bookmarksRoot.appendChild(messageElement);
}

function showBookmarks(bookmarkNodes, parent, parentTitle = []) {
  if (!bookmarkNodes || !bookmarkNodes.length) {
    return;
  }
  // 优先显示书签，再显示文件夹
  const bookmarkItems = bookmarkNodes.filter((node) => node.url);
  bookmarkItems.forEach((bookmarkNode) => {
    // One broken bookmark must not leave the whole list empty
    try {
      createBookmarkItem(bookmarkNode, parent);
    } catch (error) {
      console.warn("Failed to render bookmark:", bookmarkNode.url, error);
    }
  });

  // Empty folders show too (a new category waits for cards), except the
  // browser's own top folders such as an empty "Mobile bookmarks"
  const isTopLevel = parentTitle.length <= 1;
  const bookmarkFolders = bookmarkNodes.filter((node) => node.children && (node.children.length > 0 || !isTopLevel));
  bookmarkFolders.forEach((bookmarkNode) => {
    createFolderForBookmarks(bookmarkNode, parent, parentTitle);
  });
}

// Parsed once; every card gets a clone instead of parsing the SVG markup again
const INFO_ICON = (() => {
  const template = document.createElement("template");
  template.innerHTML = ICONS.info;
  return template.content.firstElementChild;
})();

function createBookmarkItem(bookmarkNode, parent, { inBestMatch = false } = {}) {
  const url = bookmarkNode.url;
  const bookItem = createElement("a", CLASS_NAMES.bookmark);
  bookItem.href = url;
  bookItem.dataset.title = bookmarkNode.title || "";
  if (bookmarkNode.id) bookItem.dataset.id = bookmarkNode.id;
  // Search results are copies; only cards in the folder list can be dragged
  if (!inBestMatch && Number.isInteger(bookmarkNode.index)) bookItem.dataset.index = String(bookmarkNode.index);
  bookItem.draggable = !inBestMatch;

  const favicon = createElement("img", CLASS_NAMES.favicon);
  favicon.src = getFavicon(url);
  favicon.alt = "";
  favicon.width = 18;
  favicon.height = 18;
  favicon.loading = "lazy";
  favicon.decoding = "async";
  favicon.draggable = false;

  const linkTitle = createElement("p", "", getDisplayName(bookmarkNode));

  // Hover: note tooltip. Click: note editor.
  const info = createElement("span", "bookmark-info");
  info.appendChild(INFO_ICON.cloneNode(true));
  if (getNote(url)) info.classList.add("has-note");

  bookItem.append(favicon, linkTitle, info);
  parent.appendChild(bookItem);
}

// The second line of a category row: its description, or how many sites it has and the first names
function getCategorySubtitle(folderNode) {
  const description = getFolderNote(folderNode.id);
  if (description) return description;
  const count = countBookmarks(folderNode);
  if (!count) return TEXT.emptyCategory;
  const names = (folderNode.children || [])
    .filter((child) => child.url)
    .slice(0, 3)
    .map((child) => getDisplayName(child));
  return [TEXT.sites(count), names.join(", ")].filter(Boolean).join(" • ");
}

// One icon that fits the category name, for example a plane for "Travel" (category-icons.js)
function createCategoryIcon(folderNode) {
  const box = createElement("span", "category-icon");
  box.appendChild(getCategoryIcon(folderNode.title).cloneNode(true));
  return box;
}

function setFolderCollapsed(folderTitle, childContainer, collapsed) {
  // An empty inline value lets the stylesheet grid layout apply again
  childContainer.style.display = collapsed ? "none" : "";
  folderTitle.classList.toggle("collapsed", collapsed);
  folderTitle.classList.toggle("expanded", !collapsed);
  if (folderTitle.dataset.stateKey) {
    localStorage.setItem(folderTitle.dataset.stateKey, collapsed ? "collapsed" : "expanded");
  }
  scheduleCollapseButtonUpdate();
}

function setAllFoldersCollapsed(collapsed) {
  for (const folderTitle of bookmarksRoot.querySelectorAll(".folderTitle.collapsible-folder")) {
    const container = folderTitle.parentElement.querySelector(":scope > .childContainer");
    if (container) setFolderCollapsed(folderTitle, container, collapsed);
  }
}

let collapseButtonFrame = 0;
function scheduleCollapseButtonUpdate() {
  if (collapseButtonFrame) return;
  collapseButtonFrame = requestAnimationFrame(() => {
    collapseButtonFrame = 0;
    updateCollapseButton();
    updateBarBorders();
    updateFocusMode();
  });
}

// Focus: with one or two categories open, the closed ones fade back like frosted
// glass (theme.css). With none open, or three and more, everything is sharp.
function updateFocusMode() {
  const open = bookmarksRoot.querySelectorAll(".category-row.expanded").length;
  bookmarksRoot.classList.toggle("is-focus", open >= 1 && open <= 2);
}

function updateCollapseButton() {
  if (!collapseBtn) return;
  const anyOpen = Boolean(bookmarksRoot.querySelector(".folderTitle.collapsible-folder.expanded"));
  collapseBtn.innerHTML = anyOpen ? ICONS.collapseAll : ICONS.expandAll;
  collapseBtn.title = anyOpen ? TEXT.collapseAll : TEXT.expandAll;
  collapseBtn.setAttribute("aria-label", collapseBtn.title);
}

// "New category" (bottom menu): a name field at the end of the list. Enter creates
// the folder at the end of the bookmarks bar; Escape or an empty name cancels.
let newCategoryRow = null;
function startNewCategory() {
  if (newCategoryRow) {
    newCategoryRow.querySelector("input").focus();
    return;
  }
  const row = createElement("div", "new-category");
  const input = createElement("input", "new-category-input");
  input.type = "text";
  input.placeholder = TEXT.categoryName;
  input.maxLength = 80;
  input.spellcheck = false;
  input.setAttribute("aria-label", TEXT.categoryName);
  row.appendChild(input);
  // Outside #bookmarks, so a re-render does not remove it
  bookmarksRoot.after(row);
  newCategoryRow = row;
  row.scrollIntoView({ block: "end" });
  input.focus();

  let finished = false;
  const finish = (create) => {
    if (finished) return;
    finished = true;
    const name = input.value.trim();
    row.remove();
    newCategoryRow = null;
    if (create && name) createCategory(name);
  };
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      finish(true);
    } else if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      finish(false);
    }
  });
  input.addEventListener("blur", () => finish(true));
}

async function createCategory(name) {
  try {
    const tree = latestTree || (await fetchBookmarkTree());
    const parentId = tree?.[0]?.children?.[0]?.id ?? "1";
    const folder = await chrome.bookmarks.create({ parentId, title: name });
    pendingRevealFolderId = folder.id;
  } catch (error) {
    console.warn("Failed to create category:", error);
    Notification.show(TEXT.failed, 1800);
  }
}

// Pencil on a category row: the name and the description turn into text fields,
// with a delete button. Enter or leaving the row saves, Escape cancels.
let isEditingCategory = false;
function startEditCategory(folderTitle, folderId) {
  const text = folderTitle.querySelector(".category-text");
  if (!text) return;
  const originalName = folderTitle.dataset.name || "";
  const originalDescription = getFolderNote(folderId);

  const form = createElement("span", "category-edit");
  const nameInput = createElement("input", "folder-rename-input");
  nameInput.type = "text";
  nameInput.value = originalName;
  nameInput.maxLength = 80;
  nameInput.spellcheck = false;
  nameInput.setAttribute("aria-label", TEXT.categoryName);
  const descriptionInput = createElement("input", "category-desc-input");
  descriptionInput.type = "text";
  descriptionInput.value = originalDescription;
  descriptionInput.maxLength = 140;
  descriptionInput.spellcheck = false;
  descriptionInput.placeholder = TEXT.descriptionPlaceholder;
  descriptionInput.setAttribute("aria-label", TEXT.descriptionPlaceholder);
  form.append(nameInput, descriptionInput);

  const deleteBtn = createElement("button", "folder-delete-btn");
  deleteBtn.type = "button";
  deleteBtn.innerHTML = ICONS.trash;
  deleteBtn.title = TEXT.deleteCategory;
  deleteBtn.setAttribute("aria-label", TEXT.deleteCategory);

  isEditingCategory = true;
  folderTitle.classList.add("is-editing");
  folderTitle.draggable = false;
  text.replaceWith(form);
  form.after(deleteBtn);
  nameInput.focus();
  nameInput.select();

  let finished = false;
  const finish = (action) => {
    if (finished) return;
    finished = true;
    isEditingCategory = false;
    const name = nameInput.value.trim();
    const description = descriptionInput.value.trim();
    form.replaceWith(text);
    deleteBtn.remove();
    folderTitle.classList.remove("is-editing");
    folderTitle.draggable = true;
    if (action === "save") {
      if (name && name !== originalName) {
        text.querySelector(".folder-label").textContent = name;
        chrome.bookmarks.update(folderId, { title: name }).catch((error) => {
          console.warn("Failed to rename category:", error);
          Notification.show(TEXT.failed, 1800);
        });
      }
      if (description !== originalDescription.trim()) {
        saveFolderNote(folderId, description).catch((error) => console.warn("Failed to save description:", error));
      }
    } else if (action === "delete") {
      deleteCategory(folderId);
    }
    // Renders that waited for the edit to end
    if (refreshAfterDrag) {
      refreshAfterDrag = false;
      refreshBookmarks();
    }
  };
  const onKeyDown = (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      finish("save");
    } else if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      finish("cancel");
    }
  };
  nameInput.addEventListener("keydown", onKeyDown);
  descriptionInput.addEventListener("keydown", onKeyDown);
  // Leaving the row saves; moving between the two fields does not
  folderTitle.addEventListener("focusout", function onFocusOut(event) {
    if (!finished && folderTitle.contains(event.relatedTarget)) return;
    folderTitle.removeEventListener("focusout", onFocusOut);
    finish("save");
  });
  // Keep the focus in a field, so the focus change does not end the edit before the click
  deleteBtn.addEventListener("pointerdown", (event) => event.preventDefault());
  deleteBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    finish("delete");
  });
}

function countBookmarks(node) {
  if (node.url) return 1;
  return (node.children || []).reduce((sum, child) => sum + countBookmarks(child), 0);
}

function collectUrls(node, urls = []) {
  if (node.url) urls.push(node.url);
  for (const child of node.children || []) collectUrls(child, urls);
  return urls;
}

// Recreates a deleted folder and everything in it, in the same order
async function restoreTree(node, parentId, index) {
  const created = await chrome.bookmarks.create({
    parentId,
    index,
    title: node.title,
    ...(node.url ? { url: node.url } : {}),
  });
  for (const child of node.children || []) {
    await restoreTree(child, created.id, undefined);
  }
  return created.id;
}

// Notes of deleted bookmarks go too, unless another bookmark has the same URL
async function removeOrphanNotes(urls) {
  for (const url of new Set(urls)) {
    if (!getNote(url)) continue;
    try {
      const same = await chrome.bookmarks.search({ url });
      if (!same.some((item) => item.url === url)) await saveNote(url, "");
    } catch (error) {
      console.warn("Failed to remove note:", error);
    }
  }
}

// Deletes a category with all its bookmarks. Undo puts the whole tree back.
async function deleteCategory(folderId) {
  try {
    const [tree] = await chrome.bookmarks.getSubTree(folderId);
    if (!tree || tree.url) return;
    const count = countBookmarks(tree);
    const description = getFolderNote(folderId);
    await chrome.bookmarks.removeTree(folderId);
    Notification.showAction(
      count ? TEXT.deletedCategory(tree.title, count) : TEXT.deleted(tree.title),
      TEXT.undo,
      () => {
        restoreTree(tree, tree.parentId, tree.index)
          .then(async (restoredId) => {
            pendingRevealFolderId = restoredId;
            // The restored folder has a new id: move the description to it
            if (description) {
              await saveFolderNote(restoredId, description);
              await saveFolderNote(folderId, "");
            }
          })
          .catch((error) => {
            console.warn("Failed to restore category:", error);
            Notification.show(TEXT.failed, 1800);
          });
      },
      count ? 8000 : 5000,
      () => {
        removeOrphanNotes(collectUrls(tree));
        if (description) saveFolderNote(folderId, "").catch(() => {});
      }
    );
  } catch (error) {
    console.warn("Failed to delete category:", error);
    Notification.show(TEXT.failed, 1800);
  }
}

// Scrolls to a folder title, opens the folder, and flashes the title
function revealFolder(id) {
  const container = bookmarksRoot.querySelector(`.childContainer[data-folder-id="${CSS.escape(String(id))}"]`);
  const folderTitle = container?.parentElement.querySelector(":scope > .folderTitle");
  if (!folderTitle) return;
  if (container.style.display === "none") setFolderCollapsed(folderTitle, container, false);
  folderTitle.scrollIntoView({ block: "center", behavior: "smooth" });
  folderTitle.classList.remove("is-new");
  void folderTitle.offsetWidth;
  folderTitle.classList.add("is-new");
  folderTitle.addEventListener("animationend", () => folderTitle.classList.remove("is-new"), { once: true });
}

function createFolderForBookmarks(bookmarkNode, parent, parentTitle = []) {
  let folder = createElement("div", CLASS_NAMES.folder);
  let childContainer = createElement("div", CLASS_NAMES.childContainer);
  // Drag and drop moves bookmarks into this folder by its id, and moves the
  // folder itself by its id and real index
  folder.dataset.id = bookmarkNode.id;
  if (Number.isInteger(bookmarkNode.index)) folder.dataset.index = String(bookmarkNode.index);
  childContainer.dataset.folderId = bookmarkNode.id;
  if (bookmarkNode.unmodifiable) childContainer.dataset.locked = "true";
  // Shown in the folder when it has no cards (see theme.css)
  if (parentTitle.length > 0) childContainer.dataset.emptyHint = TEXT.dropHint;
  // 递归传递父级的 title
  const title = [...parentTitle];
  title.push(bookmarkNode.title);
  const isEmpty = !bookmarkNode.children?.length;
  // 如果文件夹下有书签，则显示标题，否则如全是文件夹则不显示
  if (isEmpty || bookmarkNode.children.some((node) => node.url)) {
    if ((folderCount > 1 || isEmpty) && bookmarkNode.title) {
      let folderName = bookmarkNode.title;
      // 如果是多级目录，则在标题前面加上父级目录
      if (title.length > 2) {
        for (let i = title.length - 2; i > 1; i--) {
          folderName = title[i] + " / " + folderName;
        }
      }

      let folderTitle = createElement("h2", CLASS_NAMES.folderTitle, "");
      // A category can be dragged by its title to change the order. The browser's
      // own top folders (bookmarks bar and so on) cannot move.
      folderTitle.draggable = parentTitle.length > 1 && !bookmarkNode.unmodifiable;
      const folderLabel = document.createElement("span");
      folderLabel.className = "folder-label";
      folderLabel.textContent = folderName;

      const isCollapsible = bookmarkNode.title !== "Favorites Bar" && bookmarkNode.title !== "收藏夹栏";

      if (isCollapsible) {
        const folderStateKey = getFolderStateKey(bookmarkNode, title);
        const legacyFolderState = localStorage.getItem(bookmarkNode.title);
        const folderState = localStorage.getItem(folderStateKey) || legacyFolderState;
        if (!localStorage.getItem(folderStateKey) && legacyFolderState) {
          localStorage.setItem(folderStateKey, legacyFolderState);
        }

        folderTitle.classList.add("collapsible-folder");
        folderTitle.dataset.stateKey = folderStateKey;
        if (folderTitle.draggable) {
          // A category is a card row: an icon of its sites, the name, and one line
          // with its description or a summary of what is inside
          folderTitle.classList.add("category-row");
          folderTitle.dataset.name = bookmarkNode.title;
          const text = createElement("span", "category-text");
          text.append(folderLabel, createElement("span", "category-subtitle", getCategorySubtitle(bookmarkNode)));
          folderTitle.append(createCategoryIcon(bookmarkNode), text);
        } else {
          folderTitle.appendChild(folderLabel);
        }
        const arrow = document.createElement("span");
        arrow.className = "folder-arrow";
        folderTitle.appendChild(arrow);
        folderTitle.title = keyText;

        // 判断是否在之前被收起来了
        const collapsed = folderState === "collapsed";
        if (collapsed) childContainer.style.display = "none";
        folderTitle.classList.add(collapsed ? "collapsed" : "expanded");

        // Pencil on hover: rename the category, or delete it from the same field
        if (folderTitle.draggable) {
          const editIcon = createElement("span", "folder-edit");
          editIcon.innerHTML = ICONS.pencil;
          editIcon.title = TEXT.editCategory;
          folderTitle.classList.add("has-edit");
          folderTitle.appendChild(editIcon);
        }

        folderTitle.addEventListener("click", function (event) {
          if (folderTitle.classList.contains("is-editing")) return;
          if (event.target.closest(".folder-edit")) {
            event.stopPropagation();
            startEditCategory(folderTitle, bookmarkNode.id);
            return;
          }
          // Alt/Option+click: open or close every folder, like Finder
          if (event.altKey) {
            setAllFoldersCollapsed(childContainer.style.display !== "none");
            return;
          }
          // 如果按住 ctrl 或 meta 键（Mac上的command键）则批量打开书签
          if (event.ctrlKey || event.metaKey) {
            const keepPanelOpen = isKeepPanelOpenEnabled();
            for (let childNode of bookmarkNode.children) {
              if (childNode.url) {
                createTab(childNode.url, !keepPanelOpen);
              }
            }
            event.preventDefault();
            return;
          }

          // 为展开/收起添加事件
          setFolderCollapsed(folderTitle, childContainer, childContainer.style.display !== "none");
        });
      } else {
        folderTitle.appendChild(folderLabel);
      }

      folder.appendChild(folderTitle);
    } else {
      folder.style.marginTop = "8px";
    }
  }

  showBookmarks(bookmarkNode.children, childContainer, title);

  folder.appendChild(childContainer);
  parent.appendChild(folder);
}

function countFolders(bookmarkNodes) {
  let count = 0;
  for (let i = 0; i < bookmarkNodes.length; i++) {
    if (bookmarkNodes[i].children && bookmarkNodes[i].children.length > 0) {
      count += 1 + countFolders(bookmarkNodes[i].children);
    }
  }
  return count;
}

function getFolderStateKey(bookmarkNode, titlePath) {
  if (bookmarkNode.id) {
    return `MAPLE_FOLDER_STATE_${bookmarkNode.id}`;
  }
  const normalizedPath = (titlePath || []).filter(Boolean).join("/");
  return `MAPLE_FOLDER_STATE_${normalizedPath}`;
}
