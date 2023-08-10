import Fuse from './fuse.js';


const CLASS_NAMES = {
  bookmark: 'bookmark',
  favicon: 'favicon',
  folder: 'folder',
  childContainer: 'childContainer',
};

let folderCount;
const browserLanguage = navigator.language.startsWith('zh') ? 'zh' : 'en';
const isMac = navigator.platform.indexOf('Mac') !== -1;
const keyHint = isMac ? 'Command' : 'Ctrl';
const keyText = browserLanguage === 'zh' ? `按住 ${keyHint} 可批量打开` : `Hold ${keyHint} and click to open all`;

let searchInput = document.getElementById('searchInput');


// 顶部推荐的 header
const headerText = document.querySelector('#header-bookmark p');
const headerFavicon = document.querySelector('#header-bookmark img');
// header url
let headerUrl = "";
// 恢复 header 元素
updateHeader(JSON.parse(localStorage.getItem('persistedHeader')));
// 第一次打开时，header 为空，隐藏 favicon
if (headerText.textContent === "") {
  headerFavicon.style.display = "none";
}


/**
 * @description 使用 Fuse 进行模糊匹配，返回最佳匹配项或false
 * @param searchTerm {string} 查询的字符串
 * @param data {{ title: string, url: string, favicon: string }[]} 要匹配的对象数组，对象包含 title 和 url 属性
 * @returns {{ title: string, url: string, favicon: string }[]|boolean} 返回最佳匹配项的对象数组或 false
 */
function FuseStrMatch(searchTerm, data) {
  const options = {
    keys: ["title", "url"],
    includeScore: true, // 包含相似度评分
    threshold: 0.5, // 相似度阈值
  };
  const fuse = new Fuse(data, options);
  const results = fuse.search(searchTerm);
  return results.length > 0 ? results[0].item : false;
}


/**
 * @description 更新 header 的内容，如果匹配失败则不更新
 * @param headerFuzeMatch {{ title: string, url: string, favicon: string }[]|boolean} 匹配到的对象数组或 false
 */
function updateHeader(headerFuzeMatch) {
  if (!headerFuzeMatch) {
    return;
  }
  headerFavicon.style.display = "block"; // 显示 favicon
  localStorage.setItem('persistedHeader', JSON.stringify(headerFuzeMatch));
  const t = headerFuzeMatch.title;
  const u = headerFuzeMatch.url;
  const f = headerFuzeMatch.favicon;
  headerText.textContent = t.length > 8 ? t.substring(0, 12) + '...' : t;
  headerFavicon.src = f;
  headerUrl = u;
}


searchInput.addEventListener('input', function () {
  let searchTerm = searchInput.value.toLowerCase();
  let folders = document.getElementsByClassName(CLASS_NAMES.folder);

  const headerData = []

  for (let folder of folders) {
    let bookmarks = folder.getElementsByClassName(CLASS_NAMES.bookmark);
    let hasVisibleBookmark = false;

    for (let bookmark of bookmarks) {
      // push 查询数据
      headerData.push({
        title: bookmark.textContent,
        url: bookmark.href,
        favicon: bookmark.querySelector('.favicon')?.src
      });

      let title = bookmark.textContent.toLowerCase();
      let url = bookmark.href.toLowerCase();

      // 当直接匹配失败时，使用模糊匹配
      if (
        title.includes(searchTerm) ||
        url.includes(searchTerm) ||
        FuseStrMatch(searchTerm, [{
          title: title,
          url: url,
          favicon: ""
        }]) !== false
      ) {
        bookmark.style.display = 'flex';
        hasVisibleBookmark = true;
      } else {
        bookmark.style.display = 'none';
      }
    }

    folder.style.display = hasVisibleBookmark ? 'block' : 'none';
  }

  updateHeader(FuseStrMatch(searchTerm, headerData));
});

window.addEventListener('keydown', function (event) {
  if (event.key === 'Escape') {
    event.preventDefault();
    searchInput.value = '';

    let bookmarks = document.getElementsByClassName(CLASS_NAMES.bookmark);
    let folders = document.getElementsByClassName(CLASS_NAMES.folder);

    for (let bookmark of bookmarks) {
      bookmark.style.display = 'flex';
    }

    for (let folder of folders) {
      folder.style.display = 'block';
    }
  }

  if (event.key === 'Enter') {
    event.preventDefault();
    if (headerUrl !== "") {
      window.open(headerUrl);
    }
  }
});

window.onload = async function () {
  setBodyHeightFromStorage();

  const bookmarkTreeNodes = await chrome.bookmarks.getTree();
  folderCount = countFolders(bookmarkTreeNodes[0].children);

  createBookmarks(bookmarkTreeNodes);
  setTimeout(saveCurrentHeight, 600);
  searchInput.focus();
};

function setBodyHeightFromStorage() {
  let savedHeight = localStorage.getItem('savedHeight');
  if (savedHeight && savedHeight > 30) {
    document.body.style.height = `${savedHeight}px`;
    if (savedHeight > 618) {
      document.body.style.height = '618px';
    }
  }
}

function saveCurrentHeight() {
  let currentHeight = document.getElementById('bookmarks').clientHeight;
  localStorage.setItem('savedHeight', currentHeight - 8);
}

function createBookmarks(bookmarkTreeNodes) {
  const bookmarksContainer = document.getElementById('bookmarks');

  if (folderCount === 0) {
    showEmptyBookmarkMessage();
  } else {
    showBookmarks(bookmarkTreeNodes, bookmarksContainer);
  }
}

function showEmptyBookmarkMessage() {
  const bookmarksContainer = document.getElementById('bookmarks');
  const messageElement = createElement('p', 'message', '🍁 No bookmarks in the current browser.');

  bookmarksContainer.appendChild(messageElement);
}

function createElement(type, className, textContent = '') {
  let element = document.createElement(type);
  element.className = className;
  element.textContent = textContent;
  return element;
}

function showBookmarks(bookmarkNodes, parent) {
  if (!bookmarkNodes || !bookmarkNodes.length) {
    return;
  }

  for (let bookmarkNode of bookmarkNodes) {
    if (bookmarkNode.url) {
      createBookmarkItem(bookmarkNode, parent);
    }

    if (bookmarkNode.children && bookmarkNode.children.length > 0) {
      createFolderForBookmarks(bookmarkNode, parent);
    }
  }
}

function createBookmarkItem(bookmarkNode, parent) {
  let favicon = createElement('img', CLASS_NAMES.favicon);
  favicon.src = `${chrome.runtime.getURL('/_favicon?')}pageUrl=${encodeURIComponent(bookmarkNode.url)}&size=32`;

  let bookItem = createElement('a', CLASS_NAMES.bookmark);
  bookItem.href = bookmarkNode.url;
  bookItem.target = '_blank';
  bookItem.appendChild(favicon);

  bookItem.addEventListener('click', function (event) {
    if (bookmarkNode.url.startsWith('chrome://') || bookmarkNode.url.startsWith('edge://')) {
      event.preventDefault();
      chrome.tabs.create({url: bookmarkNode.url});
    }
  });

  let linkTitle = createElement('p', '', bookmarkNode.title ? bookmarkNode.title : getTitleFromUrl(bookmarkNode.url));
  bookItem.appendChild(linkTitle);

  parent.appendChild(bookItem);
}

function createFolderForBookmarks(bookmarkNode, parent) {
  let folder = createElement('div', CLASS_NAMES.folder);
  let childContainer = createElement('div', CLASS_NAMES.childContainer);

  if (folderCount > 1 && bookmarkNode.title) {
    let folderTitle = createElement('h2', '', bookmarkNode.title);

    if (bookmarkNode.title !== 'Favorites Bar' && bookmarkNode.title !== '收藏夹栏') {
      folderTitle.title = keyText;

      // 判断是否在之前被收起来了
      if (localStorage.getItem(bookmarkNode.title) === 'collapsed') {
        childContainer.style.display = 'none';
      }

      folderTitle.addEventListener('click', function (event) {
        // 为展开/收起添加事件
        if (childContainer.style.display === 'none') {
          childContainer.style.display = 'flex';
          localStorage.setItem(bookmarkNode.title, 'expanded');
        } else {
          childContainer.style.display = 'none';
          localStorage.setItem(bookmarkNode.title, 'collapsed');
        }

        // 如果按住 ctrl 或 meta 键（Mac上的command键）则批量打开书签
        if (event.ctrlKey || event.metaKey) {
          for (let childNode of bookmarkNode.children) {
            if (childNode.url) {
              chrome.tabs.create({url: childNode.url});
            }
          }
          event.preventDefault();
        }
      });
    }

    folder.appendChild(folderTitle);
  } else {
    folder.style.marginTop = '8px';
  }

  showBookmarks(bookmarkNode.children, childContainer);

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
  if (url.startsWith('chrome://') || url.startsWith('edge://')) {
    return url.split('//')[1].split('/')[0].charAt(0).toUpperCase() + url.split('//')[1].split('/')[0].slice(1);
  }

  let host = new URL(url).host;
  let parts = host.startsWith('www.') ? host.split('.')[1] : host.split('.')[0];

  return parts.charAt(0).toUpperCase() + parts.slice(1);
}
