// favicon缓存
const faviconCache = new Map();

export function getFavicon(url) {
  // 检查缓存
  if (faviconCache.has(url)) {
    return faviconCache.get(url);
  }

  const isFirefox = navigator.userAgent.includes("Firefox");
  let faviconUrl;

  if (isFirefox) {
    faviconUrl = `http://www.google.com/s2/favicons?domain_url=${url}`;
  } else {
    faviconUrl = `${chrome.runtime.getURL("/_favicon?")}pageUrl=${encodeURIComponent(url)}&size=32`;
  }

  // 缓存结果
  faviconCache.set(url, faviconUrl);
  return faviconUrl;
}
