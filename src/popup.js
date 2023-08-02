const CLASS_NAMES = {
  bookmark: 'bookmark',
  favicon: 'favicon',
  folder: 'folder',
  childContainer: 'childContainer',
};

let folderCount;
let browserLanguage = navigator.language.startsWith('zh') ? 'zh' : 'en';
let keyHint = navigator.platform.indexOf('Mac') !== -1 ? (browserLanguage === 'zh' ? 'Command' : 'Ctrl') : (browserLanguage === 'zh' ? 'Ctrl' : 'Command');

window.onload = async function () {
  setBodyHeightFromStorage();

  const bookmarkTreeNodes = await chrome.bookmarks.getTree();
  folderCount = countFolders(bookmarkTreeNodes[0].children);

  createBookmarks(bookmarkTreeNodes);
  setTimeout(saveCurrentHeight, 600);
};

function setBodyHeightFromStorage() {
  let savedHeight = localStorage.getItem('savedHeight');
  if (savedHeight && savedHeight > 30) {
    document.body.style.height = `${savedHeight}px`;
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
      chrome.tabs.create({ url: bookmarkNode.url });
    }
  });

  let linkTitle = createElement('p', '', bookmarkNode.title ? bookmarkNode.title : getTitleFromUrl(bookmarkNode.url));
  bookItem.appendChild(linkTitle);

  parent.appendChild(bookItem);
}

function createFolderForBookmarks(bookmarkNode, parent) {
  let folder = createElement('div', CLASS_NAMES.folder);

  if (folderCount > 1 && bookmarkNode.title) {
    let folderTitle = createElement('h2', '', bookmarkNode.title);
    folderTitle.title = browserLanguage === 'zh' ? `按住 ${keyHint} 可批量打开` : `Hold ${keyHint} and click to open all`;
    folderTitle.addEventListener('click', function (event) {
      if (event.ctrlKey || event.metaKey) {
        for (let childNode of bookmarkNode.children) {
          if (childNode.url) {
            chrome.tabs.create({ url: childNode.url });
          }
        }
        event.preventDefault();
      }
    });

    folder.appendChild(folderTitle);
  } else {
    folder.style.marginTop = '6px';
  }

  let childContainer = createElement('div', CLASS_NAMES.childContainer);
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
