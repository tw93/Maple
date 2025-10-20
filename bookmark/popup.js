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
};

const HAS_SEEN_SETTINGS_HINT_KEY = "MAPLE_SETTINGS_HINT_SEEN";

// 获取搜索功能开启状态
function isSearchEnabled() {
  return localStorage.getItem(SETTINGS_KEYS.SEARCH_ENABLED) === "true";
}

// 获取 tips 功能开启状态
function isTipsEnabled() {
  return localStorage.getItem(SETTINGS_KEYS.TIPS_ENABLED) !== "false";
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
// 基于设置来决定搜索是否默认隐藏，如果搜索功能关闭，则强制隐藏
let searchIsHide;
if (isSearchEnabled()) {
  searchIsHide = !(localStorage.getItem("SHOW_SEARCH_BAR") === "true");
} else {
  // 搜索功能关闭时，强制隐藏搜索框
  searchIsHide = true;
}

let bestMatches = [];
// 延迟恢复 header 元素，避免阻塞初始渲染
setTimeout(() => {
  if (isSearchEnabled()) {
    const persistedHeader = localStorage.getItem("persistedHeader");
    if (persistedHeader) {
      try {
        updateHeader(JSON.parse(persistedHeader), true);
        updateActiveBestMatch(activeBestMatchIndex);
      } catch (e) {
        // 忽略解析错误
      }
    }
  }
}, 0);

// 设置按钮事件监听
if (settingsBtn) {
  // 设置国际化文本
  const browserLanguage = navigator.language.startsWith("zh") ? "zh" : "en";
  const isZh = browserLanguage === "zh";
  settingsBtn.title = isZh ? "设置" : "Settings";

  settingsBtn.addEventListener("click", function (e) {
    e.preventDefault();
    e.stopPropagation();
    try {
      if (typeof chrome !== "undefined" && chrome.runtime) {
        chrome.runtime.openOptionsPage();
      } else {
        // 兼容Firefox
        window.open("settings.html", "_blank");
      }
    } catch (error) {
      console.error("Failed to open settings page:", error);
      // 备用方案：直接打开设置页面
      window.open("settings.html", "_blank");
    }
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

/**
 * @description 使用 Fuse 进行模糊匹配，返回最佳匹配项或false
 * @param searchTerm {string} 查询的字符串
 * @param data {{ title: string, url: string, favicon: string }[]} 要匹配的 对象数组，包含 title 和 url 属性
 * @returns {{ title: string, url: string, favicon: string }[]|null} 返回最佳匹配项的 对象数组 或 null
 */
function FuseStrMatch(searchTerm, data) {
  const options = {
    keys: ["title", "url"],
    ignoreLocation: false, // 全搜索
    includeScore: true, // 包含相似度评分
    threshold: 0.5, // 相似度阈值
    shouldSort: true, // 是否排序
  };
  const fuse = new Fuse(data, options);
  const results = fuse.search(searchTerm);
  const cache = new Map();
  const noRepeatResult = results.reduce((acc, bookmark) => {
    if (cache.has(bookmark.item.url)) {
      return acc;
    } else {
      cache.set(bookmark.item.url, true);
      return [...acc, bookmark];
    }
  }, []);

  return results.length > 0 ? noRepeatResult.slice(0, 3).map(({ item }) => item) : null;
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
      searchInput.focus();
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
  const tipsCon = curBestMathEle.querySelector("p");
  if (checkOverflow(tipsCon)) {
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
  const title = createElement("h2", "", init ? LastBestMatch : BestMatch);
  title.title = BestMatchTitle;
  headerFuzeMatch.map((matchedBookmark) => {
    createBookmarkItem(matchedBookmark, childContainer);
  });
  bestMatchFolder.appendChild(title);
  bestMatchFolder.appendChild(childContainer);
  bestMatches = headerFuzeMatch;

  localStorage.setItem("persistedHeader", JSON.stringify(headerFuzeMatch));
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

// 只在搜索功能开启时才添加搜索相关的事件监听器
if (isSearchEnabled()) {
  searchInput.addEventListener(
    "input",
    debounce(function () {
      let searchTerm = searchInput.value.toLowerCase();
      let folders = document.getElementsByClassName(CLASS_NAMES.folder);

      const headerData = [];

      for (let folder of folders) {
        let bookmarks = folder.getElementsByClassName(CLASS_NAMES.bookmark);
        let hasVisibleBookmark = false;

        for (let bookmark of bookmarks) {
          // push 查询数据
          headerData.push({
            title: bookmark.textContent,
            url: bookmark.href,
            favicon: bookmark.querySelector(".favicon")?.src,
          });

          let title = bookmark.textContent.toLowerCase();
          let url = bookmark.href.toLowerCase();

          // 当直接匹配失败时，使用模糊匹配
          if (
            title.includes(searchTerm) ||
            url.includes(searchTerm) ||
            FuseStrMatch(searchTerm, [
              {
                title: title,
                url: url,
                favicon: "",
              },
            ])
          ) {
            bookmark.style.display = "flex";
            hasVisibleBookmark = true;
          } else {
            bookmark.style.display = "none";
          }
        }

        folder.style.display = hasVisibleBookmark ? "block" : "none";
      }

      updateHeader(FuseStrMatch(searchTerm, headerData));
    }, 30)
  );

  hideArrow.addEventListener("click", function () {
    switchSearchBarShowStatus();
    if (!searchIsHide) {
      searchInput.focus();
    }
  });

  hideArrowIcon.addEventListener("mouseover", function () {
    const tips = searchIsHide ? ShowSearchWrapper : HideSearchWrapper;
    Notification.show(tips);
  });

  hideArrowIcon.addEventListener("mouseleave", function () {
    Notification.hide();
  });
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
      chrome.tabs.create({ url: bestMatches[activeBestMatchIndex].url });
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

// 在DOM ready时立即设置高度
document.addEventListener("DOMContentLoaded", function () {
  // 在内容加载后设置初始高度，与内联script配合
  setTimeout(() => {
    setBodyHeightFromStorage();
  }, 50); // 短延迟确保内联script先执行
});

window.onload = async function () {
  const bookmarkTreeNodes = await chrome.bookmarks.getTree();
  folderCount = countFolders(bookmarkTreeNodes[0].children);
  const container = document.querySelector("#search-wrapper");
  const bookmarksContainer = document.querySelector("#bookmarks");

  createBookmarks(bookmarkTreeNodes);

  // 首先更新搜索功能的显示状态
  updateSearchFeatureVisibility();

  // 只在搜索功能开启时才处理搜索框的显示/隐藏
  if (isSearchEnabled()) {
    if (searchIsHide) {
      // -8 是因为有 8px 的 margin
      const searchBarContainerHeight = container.clientHeight - 8;
      bookmarksContainer.style.transform = `translateY(-${searchBarContainerHeight}px)`;
      hotArea.style.display = "block";
    } else {
      container.classList.add("show");
      bookmarksContainer.style.transform = `translateY(-8)`;
      searchInput.focus();
      hotArea.style.display = "none";
    }
  }

  // 计算并设置正确的高度
  const actualHeight = calculateOptimalHeight();

  // 只在必要时使用平滑过渡更新高度
  // 移除与CSS变量的冲突，让动画自然完成后再调整
  setTimeout(() => {
    const currentHeight = parseInt(getComputedStyle(document.body).height) || 400;

    if (Math.abs(actualHeight - currentHeight) > 20) {
      document.body.style.transition = "height 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94)";
      document.body.style.height = `${actualHeight}px`;

      setTimeout(() => {
        document.body.style.transition = "";
      }, 250);
    }
  }, 200); // 等待入场动画完成

  // delay to add transition animation to stop initial animation
  setTimeout(() => {
    container.style.transition = "all 0.28s cubic-bezier(0.25, 0.46, 0.45, 0.94)";
    bookmarksContainer.style.transition = "all 0.28s cubic-bezier(0.25, 0.46, 0.45, 0.94)";
  }, 100); // 增加延迟确保内容完全加载
};

function setBodyHeightFromStorage() {
  let savedHeight = localStorage.getItem("savedHeight");
  let savedSearchState = localStorage.getItem("SHOW_SEARCH_BAR");
  let savedSearchEnabled = localStorage.getItem("MAPLE_SEARCH_ENABLED");

  if (savedHeight && savedHeight > 30) {
    let height = Math.min(Math.max(parseInt(savedHeight), 200), 618);

    // 根据保存的搜索状态智能调整高度
    if (savedSearchEnabled === "true" && savedSearchState === "true") {
      // 搜索功能开启且搜索框显示时，使用保存的高度
      height = Math.min(Math.max(parseInt(savedHeight), 250), 618);
    } else if (savedSearchEnabled === "true" && savedSearchState !== "true") {
      // 搜索功能开启但搜索框隐藏时，减少一些高度
      height = Math.min(Math.max(parseInt(savedHeight) - 60, 200), 618);
    } else if (savedSearchEnabled !== "true") {
      // 搜索完全关闭时，进一步减少高度
      height = Math.min(Math.max(parseInt(savedHeight) - 80, 200), 618);
    }

    // 直接设置body高度
    document.body.style.height = `${height}px`;
  } else {
    // 如枟没有保存的高度，根据功能状态设置合适的初始高度
    let initialHeight = 400;
    if (savedSearchEnabled === "true" && savedSearchState === "true") {
      initialHeight = 520; // 搜索开启且显示
    } else if (savedSearchEnabled === "true") {
      initialHeight = 460; // 搜索开启但隐藏
    } else {
      initialHeight = 380; // 搜索完全关闭
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
  if (bestMatchContainer && bestMatchContainer.children.length > 0) {
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
  if (!isSearchEnabled()) {
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
  bookItem.target = "_blank";
  bookItem.appendChild(favicon);

  bookItem.addEventListener("click", function (event) {
    if (bookmarkNode.url.startsWith("chrome://") || bookmarkNode.url.startsWith("edge://")) {
      event.preventDefault();
      if (typeof browser !== "undefined") {
        // Firefox
        browser.tabs.create({ url: bookmarkNode.url });
      } else {
        // Chrome
        chrome.tabs.create({ url: bookmarkNode.url });
      }
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
        folderTitle.classList.add("collapsible-folder");
        folderTitle.appendChild(folderLabel);
        const arrow = document.createElement("span");
        arrow.className = "folder-arrow";
        folderTitle.appendChild(arrow);
        folderTitle.title = keyText;
        folderTitle.style.cursor = "pointer";

        // 判断是否在之前被收起来了
        if (localStorage.getItem(bookmarkNode.title) === "collapsed") {
          childContainer.style.display = "none";
          folderTitle.classList.add("collapsed");
        } else {
          folderTitle.classList.add("expanded");
        }

        folderTitle.addEventListener("click", function (event) {
          // 为展开/收起添加事件
          if (childContainer.style.display === "none") {
            childContainer.style.display = "flex";
            localStorage.setItem(bookmarkNode.title, "expanded");
            folderTitle.classList.remove("collapsed");
            folderTitle.classList.add("expanded");
          } else {
            childContainer.style.display = "none";
            localStorage.setItem(bookmarkNode.title, "collapsed");
            folderTitle.classList.add("collapsed");
            folderTitle.classList.remove("expanded");
          }

          // 如果按住 ctrl 或 meta 键（Mac上的command键）则批量打开书签
          if (event.ctrlKey || event.metaKey) {
            for (let childNode of bookmarkNode.children) {
              if (childNode.url) {
                chrome.tabs.create({ url: childNode.url });
              }
            }
            event.preventDefault();
          } else {
            // 只有在普通点击（非批量打开）时才更新高度
            setTimeout(() => {
              updatePopupHeight();
            }, 100); // 等待展开/收起动画完成
          }
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

function getTitleFromUrl(url) {
  if (url.startsWith("chrome://") || url.startsWith("edge://") || url.startsWith("about:")) {
    return url.split("//")[1].split("/")[0].charAt(0).toUpperCase() + url.split("//")[1].split("/")[0].slice(1);
  }

  let host = new URL(url).host;
  let parts = host.startsWith("www.") ? host.split(".")[1] : host.split(".")[0];

  return parts.charAt(0).toUpperCase() + parts.slice(1);
}
