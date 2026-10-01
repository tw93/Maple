// favicon缓存
const faviconCache = new Map();

// Local globe icon for bookmarks with no favicon lookup (no network request)
const DEFAULT_ICON =
  "data:image/svg+xml," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none" stroke="#9a9189" stroke-width="1.2"><circle cx="8" cy="8" r="6.2"/><path d="M1.8 8h12.4M8 1.8c1.7 1.8 2.6 3.9 2.6 6.2s-.9 4.4-2.6 6.2C6.3 12.4 5.4 10.3 5.4 8S6.3 3.6 8 1.8z"/></svg>'
  );

// Intranet names and IP addresses must not go to a third-party service
function isPrivateHost(host) {
  return (
    !host.includes(".") ||
    host.startsWith("[") ||
    /^[\d.]+$/.test(host) ||
    /\.(local|localhost|internal|intranet|lan|home|corp|test|invalid|home\.arpa)$/.test(host)
  );
}

export function getFavicon(url) {
  // 检查缓存
  if (faviconCache.has(url)) {
    return faviconCache.get(url);
  }

  const isFirefox = navigator.userAgent.includes("Firefox");
  let faviconUrl;

  if (isFirefox) {
    // Firefox has no local favicon API. Send only the host to the favicon
    // service, never the full URL, which can hold paths, tokens or queries.
    let host = "";
    try {
      host = new URL(url).hostname;
    } catch {
      // not a web address
    }
    faviconUrl =
      host && !isPrivateHost(host)
        ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=32`
        : DEFAULT_ICON;
  } else {
    faviconUrl = `${chrome.runtime.getURL("/_favicon?")}pageUrl=${encodeURIComponent(url)}&size=32`;
  }

  // 缓存结果
  faviconCache.set(url, faviconUrl);
  return faviconUrl;
}
