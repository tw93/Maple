import Fuse from "./lib/fuse.js";
import { debounce } from "./utils/debounce.js";
import { keyText, BestMatchTitle, LastBestMatch, BestMatch, EmptyBookmarkMessage } from "./utils/i18n.js";
import { Notification } from "./utils/notification.js";
import { createElement } from "./utils/element.js";
import { getFavicon } from "./utils/favicon.js";

// 设置相关常量
const SETTINGS_KEYS = {
  SEARCH_ENABLED: "MAPLE_SEARCH_ENABLED",
  TIPS_ENABLED: "MAPLE_TIPS_ENABLED",
  OPEN_IN_NEW_TAB: "MAPLE_OPEN_IN_NEW_TAB",
  KEEP_PANEL_OPEN: "MAPLE_KEEP_PANEL_OPEN",
};

const HAS_SEEN_SETTINGS_HINT_KEY = "MAPLE_SETTINGS_HINT_SEEN";
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

function createTab(url, active = true) {
  if (typeof browser !== "undefined") {
    browser.tabs.create({ url, active });
  } else {
    chrome.tabs.create({ url, active });
  }
}

function updateCurrentTab(url) {
  if (typeof browser !== "undefined") {
    browser.tabs.update({ url });
  } else {
    chrome.tabs.update({ url });
  }
}

const CLASS_NAMES = {
  bookmark: "bookmark",
  favicon: "favicon",
  folder: "folder",
  childContainer: "childContainer",
  Notification: "Notification",
  folderTitle: "folderTitle",
};

let folderCount;

let searchInput = document.getElementById("searchInput");
let hotArea = document.querySelector("#hot-area");
let settingsBtn = document.getElementById("settingsBtn");
let settingsWrapper = document.querySelector(".settings-wrapper");
let modeBtn = document.getElementById("modeBtn");

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

const isZhUI = navigator.language.startsWith("zh");

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
          "tips-title": "Hover Tooltips",
          "tips-desc": "Show full bookmark titles on hover.",
          "newtab-title": "Open in New Tab",
          "newtab-desc": "Open bookmarks in a new tab vs the current one.",
          "keep-title": "Keep Panel Open",
          "keep-desc": "Open in background tabs to keep the panel visible.",
        };
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
    const tips = document.getElementById("overlayTipsEnabled");
    const newtab = document.getElementById("overlayOpenInNewTab");
    const keep = document.getElementById("overlayKeepPanelOpen");

    if (sidebar) {
      sidebar.addEventListener("change", () => {
        const desiredSidebar = sidebar.checked;
        // Eğer hedef zaten mevcut moddaysa hiçbir şey yapma
        if (desiredSidebar === IS_SIDEBAR_MODE) return;
        // Mode-btn ile aynı flow'u tetikle (window.close + popup-window açma fallback'leriyle)
        if (modeBtn) {
          modeBtn.click();
        } else {
          try {
            chrome.runtime.sendMessage({
              type: "MAPLE_SET_MODE",
              mode: desiredSidebar ? "sidebar" : "popup",
              openImmediately: true,
            });
          } catch (err) {
            console.error("Failed to update mode:", err);
          }
        }
      });
    }
    if (search) {
      search.addEventListener("change", () => {
        localStorage.setItem(SETTINGS_KEYS.SEARCH_ENABLED, search.checked.toString());
        location.reload();
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
    const tips = document.getElementById("overlayTipsEnabled");
    const newtab = document.getElementById("overlayOpenInNewTab");
    const keep = document.getElementById("overlayKeepPanelOpen");
    const sidebar = document.getElementById("overlaySidebarMode");

    if (search) search.checked = localStorage.getItem(SETTINGS_KEYS.SEARCH_ENABLED) === "true";
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
  settingsBtn.title = isZhUI ? "设置" : "Settings";

  settingsBtn.addEventListener("click", function (e) {
    e.preventDefault();
    e.stopPropagation();
    SETTINGS_OVERLAY.open();
  });
} else {
  console.error("Settings button not found");
}

if (settingsWrapper && localStorage.getItem(HAS_SEEN_SETTINGS_HINT_KEY) !== "true") {
  // 初次打开时短暂展示设置按钮，随后仅在悬停时显示
  settingsWrapper.classList.add("show-once");
  localStorage.setItem(HAS_SEEN_SETTINGS_HINT_KEY, "true");
  setTimeout(() => {
    settingsWrapper.classList.remove("show-once");
  }, 1800);
}

// 监听显示模式变化：如果当前面板与新模式不一致，则自动关闭，避免 popup 与 sidebar 同时显示
if (typeof chrome !== "undefined" && chrome.storage?.onChanged) {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local" || !changes.MAPLE_DISPLAY_MODE) return;
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
  const browserLang = navigator.language.startsWith("zh") ? "zh" : "en";
  const isZhMode = browserLang === "zh";
  modeBtn.title = IS_SIDEBAR_MODE
    ? isZhMode
      ? "切换到弹窗模式"
      : "Switch to popup"
    : isZhMode
      ? "切换到侧边栏模式"
      : "Switch to sidebar";
  // Sidebar moddayken popup-benzeri ikon (hedef = popup), popup moddayken sidebar-benzeri ikon
  modeBtn.textContent = IS_SIDEBAR_MODE ? "🪟" : "▤";

  modeBtn.addEventListener("click", async function (e) {
    e.preventDefault();
    e.stopPropagation();
    const nextMode = IS_SIDEBAR_MODE ? "popup" : "sidebar";

    // Önce mod state'ini background'a yazmayı bekle (popup config'inin güncellenmesi için)
    try {
      await new Promise((resolve) => {
        try {
          chrome.runtime.sendMessage(
            {
              type: "MAPLE_SET_MODE",
              mode: nextMode,
              openImmediately: !IS_SIDEBAR_MODE, // popup→sidebar için background sidePanel.open çağırsın
            },
            () => resolve()
          );
        } catch {
          resolve();
        }
      });
    } catch {
      // ignore
    }

    // Sidebar → popup geçişi: önce action.openPopup dene (toolbar'a yapışık, URL bar yok),
    // başarısız olursa konumlu popup window aç
    if (IS_SIDEBAR_MODE) {
      let opened = false;
      try {
        if (chrome.action?.openPopup) {
          await chrome.action.openPopup();
          opened = true;
        }
      } catch (error) {
        console.warn("chrome.action.openPopup failed, falling back to window:", error);
      }

      if (!opened) {
        try {
          if (chrome.windows?.create) {
            const popupWidth = 420;
            const popupHeight = 560;
            // Mevcut tarayıcı penceresinin sağ üstüne yerleştir (toolbar ikonu yakınına)
            let left;
            let top;
            try {
              const currentWindow = await chrome.windows.getCurrent();
              if (currentWindow) {
                left = Math.max(0, (currentWindow.left || 0) + (currentWindow.width || 1200) - popupWidth - 24);
                top = (currentWindow.top || 0) + 72;
              }
            } catch {
              // ignore positioning errors
            }
            await chrome.windows.create({
              url: chrome.runtime.getURL("popup.html"),
              type: "popup",
              width: popupWidth,
              height: popupHeight,
              focused: true,
              ...(left !== undefined ? { left: Math.round(left) } : {}),
              ...(top !== undefined ? { top: Math.round(top) } : {}),
            });
          } else if (typeof window !== "undefined" && window.open) {
            window.open(chrome.runtime.getURL("popup.html"), "_blank", "popup,width=420,height=560");
          }
        } catch (error) {
          console.error("Failed to open popup window from sidebar:", error);
        }
      }
    }

    // Mevcut paneli kapat
    setTimeout(() => {
      try {
        window.close();
      } catch {
        // ignore
      }
    }, 80);
  });
}

// 更新搜索功能显示状态
function updateSearchFeatureVisibility() {
  const searchWrapper = document.querySelector("#search-wrapper");
  const hotArea = document.querySelector("#hot-area");

  if (!isSearchEnabled()) {
    // 搜索功能关闭时，完全隐藏搜索相关元素
    searchWrapper.style.display = "none";
    hotArea.style.display = "none";
    // 清空最佳匹配
    const bestMatchContainer = document.querySelector("#best-match");
    if (bestMatchContainer) {
      bestMatchContainer.innerHTML = "";
    }
  } else {
    // 搜索功能开启时，恢复正常显示
    searchWrapper.style.display = "block";
    hotArea.style.display = searchIsHide ? "block" : "none";
  }
}

function showLoadingState() {
  const bookmarksContainer = document.getElementById("bookmarks");
  if (!bookmarksContainer) {
    return;
  }
  if (bookmarksContainer.children.length > 0) {
    return;
  }
  const loadingState = createElement("div", "loading-state", "");
  loadingState.dataset.loading = "true";
  loadingState.setAttribute("aria-label", navigator.language.startsWith("zh") ? "书签加载中" : "Loading bookmarks");

  const loadingTitle = createElement("div", "loading-title", "");
  const loadingGrid = createElement("div", "loading-grid", "");

  for (let i = 0; i < 9; i++) {
    loadingGrid.appendChild(createElement("div", "loading-card", ""));
  }

  loadingState.appendChild(loadingTitle);
  loadingState.appendChild(loadingGrid);
  bookmarksContainer.appendChild(loadingState);
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

function invalidateBookmarkCache() {
  _bookmarkCache = null;
  _fuseInstance = null;
}

function getBookmarkCache() {
  if (_bookmarkCache) return _bookmarkCache;
  // Sadece #bookmarks ağacını cache'le; #best-match (search sonuçları) hariç
  const root = document.getElementById("bookmarks");
  if (!root) {
    _bookmarkCache = { folders: [], items: [] };
    return _bookmarkCache;
  }
  const folderEls = Array.from(root.getElementsByClassName(CLASS_NAMES.folder));
  const items = [];
  for (const el of root.getElementsByClassName(CLASS_NAMES.bookmark)) {
    // Ata folder zincirini önceden hesapla (closest-first)
    const ancestors = [];
    let p = el.parentElement;
    while (p && p !== root) {
      if (p.classList?.contains(CLASS_NAMES.folder)) ancestors.push(p);
      p = p.parentElement;
    }
    const title = el.textContent;
    const url = el.href;
    items.push({
      el,
      ancestors,
      title,
      titleLower: title.toLowerCase(),
      url,
      urlLower: url.toLowerCase(),
      favicon: el.querySelector(".favicon")?.src,
    });
  }
  _bookmarkCache = { folders: folderEls, items };
  return _bookmarkCache;
}

function getFuseInstance() {
  if (_fuseInstance) return _fuseInstance;
  const { items } = getBookmarkCache();
  _fuseInstance = new Fuse(items, FUSE_OPTIONS);
  return _fuseInstance;
}

/**
 * 智能更新popup高度
 */
function updatePopupHeight() {
  applyFixedPopupSize();
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
 * @param headerFuzeMatch {{ title: string, url: string, favicon: string }[]|null} 匹配到的 对象数组 或 null
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
    createBookmarkItem(matchedBookmark, childContainer);
  });
  bestMatchFolder.appendChild(headerRow);
  bestMatchFolder.appendChild(childContainer);
  bestMatches = headerFuzeMatch;

  localStorage.setItem("persistedHeader", JSON.stringify(headerFuzeMatch));
  document.querySelector("#best-match").appendChild(bestMatchFolder);
  updateActiveBestMatch(0);
}

function clearBestMatches() {
  localStorage.removeItem("persistedHeader");
  const bestMatchContainer = document.querySelector("#best-match");
  if (bestMatchContainer) bestMatchContainer.innerHTML = "";
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
if (isSearchEnabled()) {
  searchInput.addEventListener(
    "input",
    debounce(function () {
      const rawTerm = searchInput.value;
      const searchTerm = rawTerm.toLowerCase().trim();
      const { folders, items } = getBookmarkCache();

      // Boş arama: her şeyi göster, header'ı temizle
      if (!searchTerm) {
        for (const it of items) it.el.style.display = "flex";
        for (const folder of folders) folder.style.display = "block";
        const bestMatchContainer = document.querySelector("#best-match");
        if (bestMatchContainer) bestMatchContainer.innerHTML = "";
        bestMatches = [];
        return;
      }

      // Tek Fuse search; tüm sonuçları al, dedupe et
      const fuse = getFuseInstance();
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
        const visible =
          it.titleLower.includes(searchTerm) || it.urlLower.includes(searchTerm) || matchedUrls.has(it.url);
        it.el.style.display = visible ? "flex" : "none";
        if (visible) {
          for (const f of it.ancestors) visibleFolders.add(f);
        }
      }
      for (const folder of folders) {
        folder.style.display = visibleFolders.has(folder) ? "block" : "none";
      }

      // Top 3 best-match header'da
      updateHeader(orderedMatches.length ? orderedMatches.slice(0, 3) : null);
    }, 80)
  );
}

// fix under mask click
document.addEventListener("click", function (e) {
  const underMaskEle = [...document.elementsFromPoint(e.clientX, e.clientY)].find(
    (el) =>
      (el.classList.contains("search-action") || el.classList.contains(CLASS_NAMES.folderTitle)) &&
      e.target.id === "hot-area"
  );
  if (underMaskEle) {
    const clickEvent = new CustomEvent("click", {
      detail: {},
    });
    underMaskEle.dispatchEvent(clickEvent);
  }
});

window.addEventListener("keydown", function (event) {
  if (event.key === "Escape") {
    event.preventDefault();
    // 只在搜索功能开启时才处理清空搜索
    if (isSearchEnabled()) {
      searchInput.value = "";

      let bookmarks = document.getElementsByClassName(CLASS_NAMES.bookmark);
      let folders = document.getElementsByClassName(CLASS_NAMES.folder);

      for (let bookmark of bookmarks) {
        bookmark.style.display = "flex";
      }

      for (let folder of folders) {
        folder.style.display = "block";
      }
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

  if (event.key === "Enter") {
    event.preventDefault();
    if (isSearchEnabled() && bestMatches.length !== 0) {
      const url = bestMatches[activeBestMatchIndex].url;
      const openInNewTab = isOpenInNewTabEnabled();
      const keepPanelOpen = isKeepPanelOpenEnabled();

      if (keepPanelOpen) {
        createTab(url, false);
      } else if (openInNewTab) {
        createTab(url);
      } else {
        updateCurrentTab(url);
      }
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

function finishPopupLayout(container, bookmarksContainer) {
  void container;
  void bookmarksContainer;
  applyFixedPopupSize();
}

function renderBookmarkTree(bookmarkTreeNodes) {
  if (!bookmarkTreeNodes || !bookmarkTreeNodes.length) {
    return;
  }
  folderCount = countFolders(bookmarkTreeNodes[0].children || []);
  const container = document.querySelector("#search-wrapper");
  const bookmarksContainer = document.querySelector("#bookmarks");

  createBookmarks(bookmarkTreeNodes);
  updateSearchFeatureVisibility();
  applySearchLayout(container, bookmarksContainer);
  finishPopupLayout(container, bookmarksContainer);
}

async function fetchBookmarkTree() {
  if (typeof browser !== "undefined") {
    return await browser.bookmarks.getTree();
  }
  return await chrome.bookmarks.getTree();
}

async function initializePopup() {
  showLoadingState();

  try {
    const bookmarkTreeNodes = await fetchBookmarkTree();
    renderBookmarkTree(bookmarkTreeNodes);
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
  setBodyHeightFromStorage();
  initializePopup();
});

function setBodyHeightFromStorage() {
  applyFixedPopupSize();
}

function createBookmarks(bookmarkTreeNodes) {
  const bookmarksContainer = document.getElementById("bookmarks");
  bookmarksContainer.innerHTML = "";

  if (folderCount === 0) {
    showEmptyBookmarkMessage();
  } else {
    // DocumentFragment ile DOM'a tek seferde ekle (reflow azaltır)
    const fragment = document.createDocumentFragment();
    showBookmarks(bookmarkTreeNodes, fragment);
    bookmarksContainer.appendChild(fragment);
  }
  // Bookmark DOM'u değişti; arama cache'ini geçersiz kıl
  invalidateBookmarkCache();
}

function showEmptyBookmarkMessage() {
  const bookmarksContainer = document.getElementById("bookmarks");
  const messageElement = createElement("p", "message", EmptyBookmarkMessage);

  bookmarksContainer.appendChild(messageElement);
}

function showBookmarks(bookmarkNodes, parent, parentTitle = []) {
  if (!bookmarkNodes || !bookmarkNodes.length) {
    return;
  }
  // 优先显示书签，再显示文件夹
  const bookmarkItems = bookmarkNodes.filter((node) => node.url);
  bookmarkItems.forEach((bookmarkNode) => {
    createBookmarkItem(bookmarkNode, parent);
  });

  const bookmarkFolders = bookmarkNodes.filter((node) => node.children && node.children.length > 0);
  bookmarkFolders.forEach((bookmarkNode) => {
    createFolderForBookmarks(bookmarkNode, parent, parentTitle);
  });
}

function createBookmarkItem(bookmarkNode, parent) {
  let favicon = createElement("img", CLASS_NAMES.favicon);
  favicon.src = getFavicon(bookmarkNode.url);

  let bookItem = createElement("a", CLASS_NAMES.bookmark);
  bookItem.href = bookmarkNode.url;

  // 设置打开方式
  if (isOpenInNewTabEnabled()) {
    bookItem.target = "_blank";
  }

  bookItem.appendChild(favicon);

  bookItem.addEventListener("click", function (event) {
    const isSpecialProtocol =
      bookmarkNode.url.startsWith("chrome://") ||
      bookmarkNode.url.startsWith("edge://") ||
      bookmarkNode.url.startsWith("file://");

    const openInNewTab = isOpenInNewTabEnabled();
    const keepPanelOpen = isKeepPanelOpenEnabled();
    const isCtrlOrMeta = event.ctrlKey || event.metaKey;

    if (keepPanelOpen) {
      event.preventDefault();
      createTab(bookmarkNode.url, false);
      return;
    }

    if (isSpecialProtocol) {
      event.preventDefault();
      if (openInNewTab || isCtrlOrMeta) {
        createTab(bookmarkNode.url);
      } else {
        updateCurrentTab(bookmarkNode.url);
      }
    } else {
      // 普通链接
      if (!openInNewTab) {
        // 如果设置为在当前标签页打开
        event.preventDefault();
        if (isCtrlOrMeta) {
          // 如果按下了 Ctrl/Meta 键，强制新标签页打开
          createTab(bookmarkNode.url);
        } else {
          // 否则在当前标签页打开
          updateCurrentTab(bookmarkNode.url);
        }
      }
      // 如果设置为新标签页打开，也就是默认情况，且 target="_blank"，交给浏览器处理
    }
  });

  let linkTitle = createElement("p", "", bookmarkNode.title ? bookmarkNode.title : getTitleFromUrl(bookmarkNode.url));
  bookItem.appendChild(linkTitle);

  let mouseleaveHandler = function () {
    if (!isTipsEnabled()) {
      return;
    }
    if (hideTimeout) {
      clearTimeout(hideTimeout);
      hideTimeout = null;
    }
    // 在mouseleave事件中，设置一个延时，然后隐藏Notification
    hideTimeout = setTimeout(() => {
      Notification.hide();
    }, 500);
  };

  bookItem.addEventListener("mouseover", function () {
    // 只有在文本溢出且 tips 功能开启的时候才做处理
    if (isTipsEnabled() && checkOverflow(linkTitle)) {
      // 如果已经计划了隐藏通知的操作，取消它
      if (hideTimeout) {
        clearTimeout(hideTimeout);
        hideTimeout = null;
      }
      Notification.show(bookmarkNode.title);
    }
  });

  bookItem.addEventListener("mouseleave", mouseleaveHandler);

  parent.appendChild(bookItem);
}

function createFolderForBookmarks(bookmarkNode, parent, parentTitle = []) {
  let folder = createElement("div", CLASS_NAMES.folder);
  let childContainer = createElement("div", CLASS_NAMES.childContainer);
  // 递归传递父级的 title
  const title = [...parentTitle];
  title.push(bookmarkNode.title);
  // 如果文件夹下有书签，则显示标题，否则如全是文件夹则不显示
  if (bookmarkNode.children?.filter((node) => node.url).length > 0) {
    if (folderCount > 1 && bookmarkNode.title) {
      let folderName = bookmarkNode.title;
      // 如果是多级目录，则在标题前面加上父级目录
      if (title.length > 2) {
        for (let i = title.length - 2; i > 1; i--) {
          folderName = title[i] + " / " + folderName;
        }
      }

      let folderTitle = createElement("h2", CLASS_NAMES.folderTitle, "");
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
        folderTitle.appendChild(folderLabel);
        const arrow = document.createElement("span");
        arrow.className = "folder-arrow";
        folderTitle.appendChild(arrow);
        folderTitle.title = keyText;
        folderTitle.style.cursor = "pointer";

        // 判断是否在之前被收起来了
        if (folderState === "collapsed") {
          childContainer.style.display = "none";
          folderTitle.classList.add("collapsed");
        } else {
          folderTitle.classList.add("expanded");
        }

        folderTitle.addEventListener("click", function (event) {
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
          if (childContainer.style.display === "none") {
            childContainer.style.display = "flex";
            localStorage.setItem(folderStateKey, "expanded");
            folderTitle.classList.remove("collapsed");
            folderTitle.classList.add("expanded");
          } else {
            childContainer.style.display = "none";
            localStorage.setItem(folderStateKey, "collapsed");
            folderTitle.classList.add("collapsed");
            folderTitle.classList.remove("expanded");
          }

          // 只有在普通点击（非批量打开）时才更新高度
          setTimeout(() => {
            updatePopupHeight();
          }, 100); // 等待展开/收起动画完成
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

function getTitleFromUrl(url) {
  if (url.startsWith("about:")) {
    const aboutPage = url.slice("about:".length).split(/[/?#]/)[0] || "about";
    return aboutPage.charAt(0).toUpperCase() + aboutPage.slice(1);
  }

  if (url.startsWith("chrome://") || url.startsWith("edge://")) {
    const internalPage = url.split("://")[1]?.split("/")[0];
    if (internalPage) {
      return internalPage.charAt(0).toUpperCase() + internalPage.slice(1);
    }
  }

  try {
    let host = new URL(url).host;
    let parts = host.startsWith("www.") ? host.split(".")[1] : host.split(".")[0];

    return parts.charAt(0).toUpperCase() + parts.slice(1);
  } catch {
    return url;
  }
}
