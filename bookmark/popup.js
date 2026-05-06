import Fuse from "./lib/fuse.js";
import { debounce } from "./utils/debounce.js";
import {
  keyText,
  BestMatchTitle,
  LastBestMatch,
  BestMatch,
  EmptyBookmarkMessage,
  ShowSearchWrapper,
  HideSearchWrapper,
} from "./utils/i18n.js";
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

const FUSE_OPTIONS = {
  keys: ["title", "url"],
  ignoreLocation: false,
  includeScore: true,
  threshold: 0.5,
  shouldSort: true,
};

const HAS_SEEN_SETTINGS_HINT_KEY = "MAPLE_SETTINGS_HINT_SEEN";

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

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

function getSearchHiddenState() {
  if (!isSearchEnabled()) {
    return true;
  }
  return localStorage.getItem("SHOW_SEARCH_BAR") !== "true";
}

function getPersistedHeader() {
  const persistedHeader = localStorage.getItem("persistedHeader");
  if (!persistedHeader) {
    return null;
  }

  try {
    const parsedHeader = JSON.parse(persistedHeader);
    if (!Array.isArray(parsedHeader) || parsedHeader.length === 0) {
      return null;
    }
    return parsedHeader;
  } catch {
    return null;
  }
}

function clearBestMatches({ clearPersisted = false } = {}) {
  const bestMatchContainer = document.querySelector("#best-match");
  if (bestMatchContainer) {
    bestMatchContainer.innerHTML = "";
  }
  bestMatches = [];
  activeBestMatchIndex = 0;

  if (clearPersisted) {
    localStorage.removeItem("persistedHeader");
  }
}

function restorePersistedHeader() {
  const persistedHeader = getPersistedHeader();
  if (persistedHeader) {
    updateHeader(persistedHeader, true);
  } else {
    clearBestMatches();
  }
}

function createTab(url, active = true) {
  if (typeof browser !== "undefined") {
    return browser.tabs.create({ url, active });
  }

  if (typeof chrome !== "undefined" && chrome.tabs?.create) {
    return new Promise((resolve, reject) => {
      chrome.tabs.create({ url, active }, (tab) => {
        const runtimeError = chrome.runtime?.lastError;
        if (runtimeError) {
          reject(new Error(runtimeError.message));
          return;
        }
        resolve(tab);
      });
    });
  }

  return Promise.resolve(window.open(url, "_blank"));
}

function updateCurrentTab(url) {
  if (typeof browser !== "undefined") {
    return browser.tabs.update({ url });
  }

  if (typeof chrome !== "undefined" && chrome.tabs?.update) {
    return new Promise((resolve, reject) => {
      chrome.tabs.update({ url }, (tab) => {
        const runtimeError = chrome.runtime?.lastError;
        if (runtimeError) {
          reject(new Error(runtimeError.message));
          return;
        }
        resolve(tab);
      });
    });
  }

  window.location.href = url;
  return Promise.resolve();
}

function getBookmarkTree() {
  if (typeof browser !== "undefined") {
    return browser.bookmarks.getTree();
  }

  if (typeof chrome !== "undefined" && chrome.bookmarks?.getTree) {
    return new Promise((resolve, reject) => {
      chrome.bookmarks.getTree((tree) => {
        const runtimeError = chrome.runtime?.lastError;
        if (runtimeError) {
          reject(new Error(runtimeError.message));
          return;
        }
        resolve(tree);
      });
    });
  }

  return Promise.reject(new Error("Bookmarks API is unavailable"));
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
let hideArrow = document.querySelector(".search-action");
let hideArrowIcon = document.querySelector(".search-action i");
let hotArea = document.querySelector("#hot-area");
let settingsBtn = document.getElementById("settingsBtn");
let settingsWrapper = document.querySelector(".settings-wrapper");

let activeBestMatchIndex = 0;
let hideTimeout = null;
let searchIndex = [];
let searchFuse = null;
let searchFolders = [];
let bestMatches = [];
let searchIsHide = getSearchHiddenState();
let isPopupInitialized = false;
let isPopupInitializing = false;
let hasBoundHotAreaHover = false;

function shouldFocusSearchInput() {
  return searchInput && isSearchEnabled() && !searchIsHide;
}

function focusSearchInput() {
  if (!shouldFocusSearchInput()) {
    return;
  }

  searchInput.focus({ preventScroll: true });
  searchInput.select();
}

function scheduleSearchInputFocus() {
  focusSearchInput();
  requestAnimationFrame(focusSearchInput);
  setTimeout(focusSearchInput, 60);
}

async function openOptionsPage() {
  if (typeof browser !== "undefined" && browser.runtime?.openOptionsPage) {
    await browser.runtime.openOptionsPage();
    return;
  }

  if (typeof chrome !== "undefined" && typeof chrome.runtime?.openOptionsPage === "function") {
    await new Promise((resolve, reject) => {
      chrome.runtime.openOptionsPage(() => {
        const runtimeError = chrome.runtime?.lastError;
        if (runtimeError) {
          reject(new Error(runtimeError.message));
          return;
        }
        resolve();
      });
    });
    return;
  }

  window.open("settings.html", "_blank");
}

// 设置按钮事件监听
if (settingsBtn) {
  // 设置国际化文本
  const browserLanguage = navigator.language.startsWith("zh") ? "zh" : "en";
  const isZh = browserLanguage === "zh";
  settingsBtn.title = isZh ? "设置" : "Settings";

  settingsBtn.addEventListener("click", function (e) {
    e.preventDefault();
    e.stopPropagation();
    openOptionsPage().catch((error) => {
      console.error("Failed to open settings page:", error);
      window.open("settings.html", "_blank");
    });
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

// 更新搜索功能显示状态
function updateSearchFeatureVisibility() {
  const searchWrapper = document.querySelector("#search-wrapper");
  const hotArea = document.querySelector("#hot-area");

  if (!isSearchEnabled()) {
    // 搜索功能关闭时，完全隐藏搜索相关元素
    searchWrapper.style.display = "none";
    hotArea.style.display = "none";
    clearBestMatches();
  } else {
    // 搜索功能开启时，恢复正常显示
    searchWrapper.style.display = "";
    hotArea.style.display = searchIsHide ? "block" : "none";
  }
}

function buildSearchIndex() {
  const bookmarkElements = Array.from(document.querySelectorAll("#bookmarks .bookmark"));
  searchFolders = Array.from(document.querySelectorAll("#bookmarks .folder"));
  searchIndex = bookmarkElements.map((bookmarkElement, index) => {
    const title = bookmarkElement.textContent || "";
    const url = bookmarkElement.href || "";
    const favicon = bookmarkElement.querySelector(".favicon")?.src || "";

    return {
      id: index,
      title,
      titleLower: title.toLowerCase(),
      url,
      urlLower: url.toLowerCase(),
      favicon,
      element: bookmarkElement,
      folder: bookmarkElement.closest(`.${CLASS_NAMES.folder}`),
    };
  });

  const fuseData = searchIndex.map(({ id, title, url, favicon }) => ({ id, title, url, favicon }));
  searchFuse = new Fuse(fuseData, FUSE_OPTIONS);
}

function getFuseResults(searchTerm) {
  if (!searchFuse || !searchTerm) {
    return [];
  }
  return searchFuse.search(searchTerm);
}

function getBestMatches(searchTerm) {
  const results = getFuseResults(searchTerm);
  if (results.length === 0) {
    return null;
  }

  const uniqueMatches = [];
  const cache = new Set();
  for (const { item } of results) {
    if (cache.has(item.url)) {
      continue;
    }
    cache.add(item.url);
    uniqueMatches.push({
      title: item.title,
      url: item.url,
      favicon: item.favicon,
    });
    if (uniqueMatches.length === 3) {
      break;
    }
  }

  return uniqueMatches.length > 0 ? uniqueMatches : null;
}

function applySearchFilter(searchTerm) {
  if (!searchIndex.length) {
    return;
  }

  const matchedIds = new Set();

  if (!searchTerm) {
    searchIndex.forEach(({ id }) => matchedIds.add(id));
  } else {
    searchIndex.forEach(({ id, titleLower, urlLower }) => {
      if (titleLower.includes(searchTerm) || urlLower.includes(searchTerm)) {
        matchedIds.add(id);
      }
    });

    getFuseResults(searchTerm).forEach(({ item }) => matchedIds.add(item.id));
  }

  const folderVisibility = new Map(searchFolders.map((folder) => [folder, false]));
  searchIndex.forEach((bookmark) => {
    const shouldShow = matchedIds.has(bookmark.id);
    const displayValue = shouldShow ? "flex" : "none";
    if (bookmark.element.style.display !== displayValue) {
      bookmark.element.style.display = displayValue;
    }

    if (shouldShow && bookmark.folder) {
      let currentFolder = bookmark.folder;
      while (currentFolder) {
        folderVisibility.set(currentFolder, true);
        currentFolder = currentFolder.parentElement?.closest(`.${CLASS_NAMES.folder}`);
      }
    }
  });

  folderVisibility.forEach((isVisible, folder) => {
    const folderDisplay = isVisible ? "block" : "none";
    if (folder.style.display !== folderDisplay) {
      folder.style.display = folderDisplay;
    }
  });

  if (!searchTerm) {
    restorePersistedHeader();
  } else {
    updateHeader(getBestMatches(searchTerm));
  }
}

/**
 * 切换 searchBar 显示状态
 */
function switchSearchBarShowStatus() {
  // 如果搜索功能关闭，则不允许切换
  if (!isSearchEnabled()) {
    return;
  }

  searchIsHide = !searchIsHide;
  localStorage.setItem("SHOW_SEARCH_BAR", searchIsHide ? "false" : "true");
  const extraClass = searchIsHide ? "" : "show";
  const container = document.querySelector("#search-wrapper");
  // 有一个8px的间距，所以减去8
  const containerHeight = container.clientHeight - 8;
  const bookmarksContainer = document.querySelector("#bookmarks");

  if (container) {
    container.classList.remove("show");
    if (extraClass) {
      container.classList.add(extraClass);
      bookmarksContainer.style.transform = `translateY(0)`;
      scheduleSearchInputFocus();
      hotArea.style.display = "none";
    } else {
      bookmarksContainer.style.transform = `translateY(-${containerHeight}px)`;
      hotArea.style.display = "block";
    }
  }

  // 智能更新窗口高度
  setTimeout(() => {
    updatePopupHeight();
  }, 300); // 等待搜索框动画完成
}

/**
 * 智能更新popup高度
 */
function updatePopupHeight() {
  const newHeight = calculateOptimalHeight();
  const currentHeight = parseInt(document.body.style.height) || 400;

  // 如果高度有显著变化，使用平滑过渡
  if (Math.abs(newHeight - currentHeight) > 10) {
    document.body.style.transition = "height 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94)";
    document.body.style.height = `${newHeight}px`;

    // 动画结束后移除过渡效果
    setTimeout(() => {
      document.body.style.transition = "";
    }, 250);
  }
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
  if (!headerFuzeMatch || headerFuzeMatch.length === 0) {
    clearBestMatches();
    return;
  }
  // 兼容旧版本，上一个版本 headerFuzeMatch 为单个对象
  if (!Array.isArray(headerFuzeMatch)) {
    headerFuzeMatch = [headerFuzeMatch];
  }
  clearBestMatches();
  const bestMatchFolder = createElement("div", CLASS_NAMES.folder);
  const childContainer = createElement("div", CLASS_NAMES.childContainer);
  const title = createElement("h2", "", init ? LastBestMatch : BestMatch);
  title.title = BestMatchTitle;
  headerFuzeMatch.forEach((matchedBookmark) => {
    createBookmarkItem(matchedBookmark, childContainer);
  });
  bestMatchFolder.appendChild(title);
  bestMatchFolder.appendChild(childContainer);
  bestMatches = headerFuzeMatch;

  if (!init) {
    localStorage.setItem("persistedHeader", JSON.stringify(headerFuzeMatch));
  }
  document.querySelector("#best-match").appendChild(bestMatchFolder);
  updateActiveBestMatch(0);
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

searchInput.addEventListener(
  "input",
  debounce(function () {
    if (!isSearchEnabled()) {
      return;
    }
    const searchTerm = searchInput.value.toLowerCase();
    applySearchFilter(searchTerm);
  }, 30)
);

hideArrow.addEventListener("click", function () {
  if (!isSearchEnabled()) {
    return;
  }
  switchSearchBarShowStatus();
  if (!searchIsHide) {
    scheduleSearchInputFocus();
  }
});

hideArrowIcon.addEventListener("mouseover", function () {
  if (!isSearchEnabled()) {
    return;
  }
  const tips = searchIsHide ? ShowSearchWrapper : HideSearchWrapper;
  Notification.show(tips);
});

hideArrowIcon.addEventListener("mouseleave", function () {
  Notification.hide();
});

// fix under mask click
document.addEventListener("click", function (e) {
  const underMaskEle = [...document.elementsFromPoint(e.clientX, e.clientY)].find(
    (el) =>
      (el.classList.contains("search-action") || el.classList.contains(CLASS_NAMES.folderTitle)) &&
      e.target.id === "hot-area"
  );
  if (underMaskEle) {
    const clickEvent = new MouseEvent("click", {
      bubbles: true,
      cancelable: true,
      clientX: e.clientX,
      clientY: e.clientY,
      ctrlKey: e.ctrlKey,
      metaKey: e.metaKey,
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
      applySearchFilter("");
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
    // 只在搜索功能开启时才允许切换
    if (isSearchEnabled()) {
      switchSearchBarShowStatus();
    }
  }
});

document.addEventListener("DOMContentLoaded", function () {
  setBodyHeightFromStorage();
  scheduleSearchInputFocus();
  initializePopup();
});

window.addEventListener("pageshow", function () {
  if (isPopupInitialized) {
    initializePopup({ force: true });
  }
});

async function initializePopup({ force = false } = {}) {
  if (isPopupInitializing || (isPopupInitialized && !force)) {
    return;
  }

  isPopupInitializing = true;
  resetPopupState();

  try {
    const bookmarkTreeNodes = await getBookmarkTree();
    folderCount = countFolders(bookmarkTreeNodes?.[0]?.children || []);
    const container = document.querySelector("#search-wrapper");
    const bookmarksContainer = document.querySelector("#bookmarks");

    createBookmarks(bookmarkTreeNodes);
    buildSearchIndex();

    updateSearchFeatureVisibility();
    applySearchWrapperState(container, bookmarksContainer);

    if (isSearchEnabled()) {
      restorePersistedHeader();
    }

    const actualHeight = calculateOptimalHeight();
    updateBodyHeight(actualHeight);

    setTimeout(() => {
      if (container) {
        container.style.transition = "all 0.28s cubic-bezier(0.25, 0.46, 0.45, 0.94)";
      }
      if (bookmarksContainer) {
        bookmarksContainer.style.transition = "all 0.28s cubic-bezier(0.25, 0.46, 0.45, 0.94)";
      }
    }, 100);

    isPopupInitialized = true;
  } catch (error) {
    console.error("Failed to initialize popup:", error);
    showInitializationError();
  } finally {
    isPopupInitializing = false;
  }
}

function resetPopupState() {
  searchIsHide = getSearchHiddenState();
  folderCount = 0;
  activeBestMatchIndex = 0;
  searchIndex = [];
  searchFuse = null;
  searchFolders = [];

  if (hideTimeout) {
    clearTimeout(hideTimeout);
    hideTimeout = null;
  }

  const searchWrapper = document.querySelector("#search-wrapper");
  const bookmarksContainer = document.querySelector("#bookmarks");
  const hotArea = document.querySelector("#hot-area");

  clearBestMatches();

  if (bookmarksContainer) {
    bookmarksContainer.innerHTML = "";
    bookmarksContainer.style.transform = "";
    bookmarksContainer.style.transition = "";
  }

  if (searchWrapper) {
    searchWrapper.classList.remove("show");
    searchWrapper.style.display = "";
    searchWrapper.style.transition = "";
    searchWrapper.style.marginTop = "-30px";
  }

  if (searchInput) {
    searchInput.value = "";
  }

  if (hotArea) {
    hotArea.style.display = "none";
  }
}

function applySearchWrapperState(container, bookmarksContainer) {
  if (!container || !bookmarksContainer) {
    return;
  }

  if (!isSearchEnabled()) {
    container.classList.remove("show");
    bookmarksContainer.style.transform = "";
    hotArea.style.display = "none";
    return;
  }

  if (searchIsHide) {
    const searchBarContainerHeight = Math.max(container.clientHeight - 8, 0);
    container.classList.remove("show");
    bookmarksContainer.style.transform = `translateY(-${searchBarContainerHeight}px)`;
    hotArea.style.display = "block";
    return;
  }

  container.classList.add("show");
  bookmarksContainer.style.transform = "translateY(-8px)";
  hotArea.style.display = "none";
  scheduleSearchInputFocus();
}

function updateBodyHeight(actualHeight) {
  setTimeout(() => {
    const currentHeight = parseInt(getComputedStyle(document.body).height, 10) || 400;

    if (Math.abs(actualHeight - currentHeight) > 20) {
      document.body.style.transition = "height 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94)";
      document.body.style.height = `${actualHeight}px`;

      setTimeout(() => {
        document.body.style.transition = "";
      }, 250);
    } else {
      document.body.style.height = `${actualHeight}px`;
    }
  }, 200);
}

function setBodyHeightFromStorage() {
  let savedHeight = localStorage.getItem("savedHeight");
  let savedSearchEnabled = localStorage.getItem("MAPLE_SEARCH_ENABLED");
  const parsedSavedHeight = Number.parseInt(savedHeight, 10);

  if (Number.isFinite(parsedSavedHeight) && parsedSavedHeight > 30) {
    const height = clamp(parsedSavedHeight, 200, 618);
    document.body.style.height = `${height}px`;
  } else {
    let initialHeight = 400;
    if (savedSearchEnabled === "true") {
      initialHeight = 460;
    } else {
      initialHeight = 380;
    }
    document.body.style.height = `${initialHeight}px`;
  }
}

function calculateOptimalHeight() {
  const bookmarksContainer = document.getElementById("bookmarks");
  const searchWrapper = document.querySelector("#search-wrapper");
  const settingsBtn = document.querySelector(".settings-btn");

  let totalHeight = 20; // 基础padding

  // 计算书签容器高度
  if (bookmarksContainer) {
    totalHeight += bookmarksContainer.scrollHeight;
  }

  // 计算搜索框高度（只有当搜索功能开启且显示时）
  if (isSearchEnabled() && !searchIsHide && searchWrapper) {
    totalHeight += searchWrapper.scrollHeight;
  }

  // 计算最佳匹配区域高度
  const bestMatchContainer = document.querySelector("#best-match");
  if (bestMatchContainer && bestMatchContainer.children.length > 0 && searchIsHide) {
    totalHeight += bestMatchContainer.scrollHeight;
  }

  // 考虑设置按钮的影响
  if (settingsBtn) {
    totalHeight += 10; // 设置按钮的额外空间
  }

  // 限制最大高度并保证最小高度
  const optimalHeight = Math.min(Math.max(totalHeight, 200), 618);

  // 保存计算结果到本地存储
  localStorage.setItem("savedHeight", optimalHeight.toString());
  localStorage.setItem("SHOW_SEARCH_BAR", searchIsHide ? "false" : "true");

  return optimalHeight;
}

function createBookmarks(bookmarkTreeNodes) {
  const bookmarksContainer = document.getElementById("bookmarks");

  if (folderCount === 0) {
    showEmptyBookmarkMessage();
  } else {
    showBookmarks(bookmarkTreeNodes, bookmarksContainer);
  }
  bindSwitchModeToFirstFolder();
}

function bindSwitchModeToFirstFolder() {
  // 只在搜索功能开启时才绑定hover效果
  if (!isSearchEnabled() || hasBoundHotAreaHover) {
    return;
  }

  const hotArea = document.querySelector("#hot-area");
  const searchWrapper = document.querySelector("#search-wrapper");
  const arrow = document.querySelector(".arrow");
  hotArea.addEventListener("mouseover", () => {
    arrow.style.opacity = 1;
    searchWrapper.style.marginTop = 0;
  });

  hotArea.addEventListener("mouseleave", () => {
    arrow.style.opacity = 0;
    searchWrapper.style.marginTop = "-30px";
  });
  hasBoundHotAreaHover = true;
}

function showInitializationError() {
  const bookmarksContainer = document.getElementById("bookmarks");
  if (!bookmarksContainer) {
    return;
  }

  bookmarksContainer.innerHTML = "";
  const message = navigator.language.startsWith("zh") ? "书签加载失败，请重新打开扩展" : "Failed to load bookmarks. Try reopening the extension.";
  bookmarksContainer.appendChild(createElement("p", "message", message));
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
