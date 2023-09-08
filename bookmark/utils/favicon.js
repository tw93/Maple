export function getFavicon(url) {
  const isFirefox = navigator.userAgent.includes("Firefox");
  if (isFirefox) {
    return `http://www.google.com/s2/favicons?domain_url=${url}`;
  }
  return `${chrome.runtime.getURL("/_favicon?")}pageUrl=${encodeURIComponent(url)}&size=32`;
}
