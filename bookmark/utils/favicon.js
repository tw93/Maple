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
    faviconUrl = `https://www.google.com/s2/favicons?domain_url=${encodeURIComponent(url)}&sz=128`;
  } else {
    // requesting a larger size from chrome favicon service
    faviconUrl = `${chrome.runtime.getURL("/_favicon?")}pageUrl=${encodeURIComponent(url)}&size=128`;
  }

  // 缓存结果
  faviconCache.set(url, faviconUrl);
  return faviconUrl;
}
