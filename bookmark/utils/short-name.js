// Short display names: the site's own domain label, without "www." or the TLD.
// "www.youtube.com" -> "youtube", "shop.example.co.uk" -> "example", "x.com" -> "x.com".

// Second-level labels under a country code, as in com.tr or co.uk
const COUNTRY_SECOND_LEVEL = new Set([
  "ac",
  "av",
  "bel",
  "biz",
  "co",
  "com",
  "edu",
  "gen",
  "go",
  "gob",
  "gov",
  "info",
  "k12",
  "ltd",
  "mil",
  "ne",
  "net",
  "nom",
  "or",
  "org",
  "plc",
  "pol",
  "sch",
  "tv",
  "web",
]);

// Domains where each subdomain is a different site, as in gemini.google.com
const SUBDOMAIN_SITES = new Set([
  "blogspot.com",
  "carrd.co",
  "firebaseapp.com",
  "framer.app",
  "framer.website",
  "github.io",
  "gitbook.io",
  "gitlab.io",
  "google.com",
  "herokuapp.com",
  "netlify.app",
  "notion.site",
  "pages.dev",
  "readthedocs.io",
  "substack.com",
  "vercel.app",
  "web.app",
  "webflow.io",
  "wordpress.com",
  "workers.dev",
]);

const GENERIC_SUBDOMAINS = new Set(["www", "m", "mobile", "app", "web", "en"]);

function nameFromHost(hostname) {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  // IP addresses, localhost and other single-label hosts stay as they are
  if (!host.includes(".") || /^[\d.]+$/.test(host) || host.startsWith("[")) return host;

  const labels = host.split(".");
  if (labels[0] === "www" && labels.length > 2) labels.shift();

  let siteIndex = labels.length - 2;
  const tld = labels[labels.length - 1];
  if (labels.length >= 3 && tld.length === 2 && COUNTRY_SECOND_LEVEL.has(labels[siteIndex])) siteIndex -= 1;

  const domain = labels.slice(siteIndex).join(".");
  let name = labels[siteIndex];
  if (SUBDOMAIN_SITES.has(domain) && siteIndex > 0 && !GENERIC_SUBDOMAINS.has(labels[siteIndex - 1])) {
    name = labels[siteIndex - 1];
  } else if (name.length <= 2) {
    // One or two letters ("x", "t") say little on their own, so keep the TLD
    name = domain;
  }
  // Punycode ("xn--bcher-kva" for bücher) is not readable; the caller uses the title
  return name.startsWith("xn--") ? "" : name;
}

/**
 * Returns the short name for a bookmark URL, or "" when the URL has no
 * domain (for example a javascript: bookmarklet), so the caller can fall back to the title.
 * @param {string} url
 * @returns {string}
 */
export function getShortName(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return "";
  }
  const { protocol, hostname, pathname } = parsed;
  if (protocol === "http:" || protocol === "https:") return nameFromHost(hostname);
  if (protocol === "file:") {
    const fileName = pathname.split("/").filter(Boolean).pop();
    if (!fileName) return "file";
    // "100%.pdf" or a Latin-1 escape such as "caf%E9.txt" is not valid UTF-8 percent-encoding
    try {
      return decodeURIComponent(fileName);
    } catch {
      return fileName;
    }
  }
  if (protocol === "about:") return pathname;
  // Browser pages such as chrome://extensions
  return hostname || "";
}
