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

const CLASS_NAMES = {
  bookmark: "bookmark",
  favicon: "favicon",
  folder: "folder",
  childContainer: "childContainer",
  Notification: "Notification",
};

let folderCount;

let searchInput = document.getElementById("searchInput");
let hideArrow = document.querySelector(".search-action");

let activeBestMatchIndex = 0;
let searchIsHide = !(localStorage.getItem("SHOW_SEARCH_BAR") === "true");

let bestMatches = [];
// 恢复 header 元素
updateHeader(JSON.parse(localStorage.getItem("persistedHeader")), true);
updateActiveBestMatch(activeBestMatchIndex);

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
  searchIsHide = !searchIsHide;
  localStorage.setItem("SHOW_SEARCH_BAR", searchIsHide ? "false" : "true");
  const extraClass = searchIsHide ? "" : "show";
  const container = document.querySelector("#search-wrapper");
  const containerHeight = container.clientHeight;
  const bookmarksContainer = document.querySelector("#bookmarks");
  if (container) {
    container.classList.remove("show");

    if (extraClass) {
      container.classList.add(extraClass);
      bookmarksContainer.style.transform = `translateY(0)`;
      searchInput.focus();
    } else {
      bookmarksContainer.style.transform = `translateY(-${containerHeight}px)`;
    }
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

hideArrow.addEventListener("mouseover", function () {
  const tips = searchIsHide ? ShowSearchWrapper : HideSearchWrapper;
  Notification.show(tips);
});

hideArrow.addEventListener("mouseleave", function () {
  Notification.hide();
});

window.addEventListener("keydown", function (event) {
  if (event.key === "Escape") {
    event.preventDefault();
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

  if (event.key === "ArrowLeft") {
    if (searchIsHide) return;
    updateActiveBestMatch(activeBestMatchIndex - 1);
    showBestMatchTips();
  }

  if (event.key === "ArrowRight") {
    if (searchIsHide) return;
    updateActiveBestMatch(activeBestMatchIndex + 1);
    showBestMatchTips();
  }

  if (event.key === "Enter") {
    event.preventDefault();
    if (bestMatches.length !== 0) {
      chrome.tabs.create({ url: bestMatches[activeBestMatchIndex].url });
    }
  }

  if (event.ctrlKey && event.key === "s") {
    event.preventDefault();
    switchSearchBarShowStatus();
  }
});

window.onload = async function () {
  setBodyHeightFromStorage();

  const bookmarkTreeNodes = await chrome.bookmarks.getTree();
  folderCount = countFolders(bookmarkTreeNodes[0].children);
  const container = document.querySelector("#search-wrapper");
  const bookmarksContainer = document.querySelector("#bookmarks");

  createBookmarks(bookmarkTreeNodes);
  setTimeout(saveCurrentHeight, 600);

  if (searchIsHide) {
    const searchBarContainerHeight = container.clientHeight;
    bookmarksContainer.style.transform = `translateY(-${searchBarContainerHeight}px)`;
    container.style.transition = "all .3s ease";
    bookmarksContainer.style.transition = "all .3s ease";
  } else {
    container.classList.add("show");
    bookmarksContainer.style.transform = `translateY(0)`;
    searchInput.focus();
    bookmarksContainer.style.transition = "all .3s ease";
    container.style.transition = "all .3s ease";
  }
};

function setBodyHeightFromStorage() {
  let savedHeight = localStorage.getItem("savedHeight");
  if (savedHeight && savedHeight > 30) {
    document.body.style.height = `${savedHeight}px`;
    if (savedHeight > 618) {
      document.body.style.height = "618px";
    }
  }
}

function saveCurrentHeight() {
  let currentHeight = document.getElementById("bookmarks").clientHeight;
  localStorage.setItem("savedHeight", (currentHeight - 8).toString());
}

function createBookmarks(bookmarkTreeNodes) {
  const bookmarksContainer = document.getElementById("bookmarks");

  if (folderCount === 0) {
    showEmptyBookmarkMessage();
  } else {
    showBookmarks(bookmarkTreeNodes, bookmarksContainer);
  }
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
  favicon.src = `${chrome.runtime.getURL("/_favicon?")}pageUrl=${encodeURIComponent(bookmarkNode.url)}&size=32`;

  let bookItem = createElement("a", CLASS_NAMES.bookmark);
  bookItem.href = bookmarkNode.url;
  bookItem.target = "_blank";
  bookItem.appendChild(favicon);

  bookItem.addEventListener("click", function (event) {
    if (bookmarkNode.url.startsWith("chrome://") || bookmarkNode.url.startsWith("edge://")) {
      event.preventDefault();
      chrome.tabs.create({ url: bookmarkNode.url });
    }
  });

  let linkTitle = createElement("p", "", bookmarkNode.title ? bookmarkNode.title : getTitleFromUrl(bookmarkNode.url));
  bookItem.appendChild(linkTitle);

  bookItem.addEventListener("mouseover", function () {
    if (checkOverflow(linkTitle)) {
      Notification.show(bookmarkNode.title);
    }
  });

  bookItem.addEventListener("mouseleave", function () {
    Notification.hide();
  });

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

      let folderTitle = createElement("h2", "", folderName);

      if (bookmarkNode.title !== "Favorites Bar" && bookmarkNode.title !== "收藏夹栏") {
        folderTitle.title = keyText;
        folderTitle.style.cursor = "pointer";

        // 判断是否在之前被收起来了
        if (localStorage.getItem(bookmarkNode.title) === "collapsed") {
          childContainer.style.display = "none";
        }

        folderTitle.addEventListener("click", function (event) {
          // 为展开/收起添加事件
          if (childContainer.style.display === "none") {
            childContainer.style.display = "flex";
            localStorage.setItem(bookmarkNode.title, "expanded");
          } else {
            childContainer.style.display = "none";
            localStorage.setItem(bookmarkNode.title, "collapsed");
          }

          // 如果按住 ctrl 或 meta 键（Mac上的command键）则批量打开书签
          if (event.ctrlKey || event.metaKey) {
            for (let childNode of bookmarkNode.children) {
              if (childNode.url) {
                chrome.tabs.create({ url: childNode.url });
              }
            }
            event.preventDefault();
          }
        });
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
  if (url.startsWith("chrome://") || url.startsWith("edge://")) {
    return url.split("//")[1].split("/")[0].charAt(0).toUpperCase() + url.split("//")[1].split("/")[0].slice(1);
  }

  let host = new URL(url).host;
  let parts = host.startsWith("www.") ? host.split(".")[1] : host.split(".")[0];

  return parts.charAt(0).toUpperCase() + parts.slice(1);
}
