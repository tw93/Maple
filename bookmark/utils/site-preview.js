// Hover preview of a site, kept in IndexedDB on this device. Opt-in in the settings.
// - "screenshot": background.js saves one when the user opens the site.
// - "share-image": until then, the site's own share image (og:image), which
//   background.js downloads once, without cookies. Cards on screen get theirs
//   before a hover, so the hover shows the preview at once.

const DB = "maple-previews";
const STORE = "previews";
// The first preview waits a moment; while one is open, the next card follows fast
const SHOW_DELAY_MS = 300;
const WARM_DELAY_MS = 80;
const WARM_MS = 400;
// Share images are asked for again after two weeks, sites without one after three days
const SHARE_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;
const MISSING_RETRY_MS = 3 * 24 * 60 * 60 * 1000;
// Share image requests that run at the same time
const PARALLEL_REQUESTS = 3;

// "www.example.com" and "example.com" are the same site (same rule as background.js)
export const previewHost = (hostname) => hostname.toLowerCase().replace(/^www\./, "");

function hostOf(pageUrl) {
  try {
    const url = new URL(pageUrl);
    return url.protocol === "https:" || url.protocol === "http:" ? previewHost(url.hostname) : "";
  } catch {
    return "";
  }
}

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: "host" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore(mode, run) {
  const db = await openDb();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const request = run(tx.objectStore(STORE));
      tx.oncomplete = () => resolve(request.result);
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

// Deletes all saved previews
export function clearPreviews() {
  return new Promise((resolve) => {
    const request = indexedDB.deleteDatabase(DB);
    request.onsuccess = request.onerror = request.onblocked = () => resolve();
  });
}

// How many sites have a preview, by kind
export async function countPreviews() {
  const all = await withStore("readonly", (store) => store.getAll()).catch(() => []);
  return {
    screenshots: all.filter((item) => item.source === "screenshot").length,
    shareImages: all.filter((item) => item.source === "share-image").length,
  };
}

// True when a site has no preview yet, or its share image is old
function needsShareImage(saved) {
  if (!saved) return true;
  if (saved.source === "screenshot") return false;
  const maxAge = saved.source === "share-image" ? SHARE_MAX_AGE_MS : MISSING_RETRY_MS;
  return Date.now() - saved.capturedAt > maxAge;
}

export function createSitePreview() {
  const el = document.createElement("div");
  el.className = "site-preview";
  const img = document.createElement("img");
  img.alt = "";
  el.appendChild(img);
  document.body.appendChild(el);

  // host -> { url, capturedAt }: object URLs for this page's lifetime
  const urls = new Map();
  // host -> share image request to background.js, waiting, running or done
  const requests = new Map();
  const queue = [];
  let running = 0;
  // host -> { source, capturedAt } of the saved previews, read once
  let known = null;
  let knownLoad = null;
  let observer = null;
  // Changes when the previews are turned off, so that late work stops
  let generation = 0;
  let timer = 0;
  let current = null;
  let hiddenAt = 0;

  // Below the card, or above it when there is no room, and inside the window
  function position(anchor) {
    const margin = 8;
    const rect = anchor.getBoundingClientRect();
    el.style.left = "0px";
    el.style.top = "0px";
    const width = el.offsetWidth;
    const height = el.offsetHeight;
    const left = Math.min(Math.max(margin, rect.left + rect.width / 2 - width / 2), window.innerWidth - width - margin);
    let top = rect.bottom + 6;
    if (top + height > window.innerHeight - margin) top = rect.top - height - 6;
    el.style.left = `${Math.round(left)}px`;
    el.style.top = `${Math.round(Math.max(margin, top))}px`;
  }

  function runQueue() {
    while (running < PARALLEL_REQUESTS && queue.length) {
      const job = queue.shift();
      running++;
      chrome.runtime
        .sendMessage({ type: "MAPLE_SHARE_IMAGE", url: job.url })
        .catch(() => null)
        .then((saved) => {
          if (saved) known?.set(job.host, saved);
          // After an error, the next hover or render asks again
          else if (requests.get(job.host) === job) requests.delete(job.host);
          job.resolve(saved);
          running--;
          runQueue();
        });
    }
  }

  // Asks background.js for a site's share image. A hover goes to the front of the line.
  function request(host, url, urgent) {
    let job = requests.get(host);
    if (!job) {
      job = { host, url };
      job.done = new Promise((resolve) => (job.resolve = resolve));
      requests.set(host, job);
      queue.push(job);
    }
    const index = queue.indexOf(job);
    if (urgent && index > 0) queue.unshift(...queue.splice(index, 1));
    runQueue();
    return job.done;
  }

  function loadKnown() {
    knownLoad ||= withStore("readonly", (store) => store.getAll())
      .catch(() => [])
      .then((all) => {
        known = new Map(all.map((item) => [item.host, { source: item.source, capturedAt: item.capturedAt }]));
        return known;
      });
    return knownLoad;
  }

  // Cards that come on screen get their share image before a hover
  async function onCardsVisible(entries, watcher) {
    const cards = entries.filter((entry) => entry.isIntersecting).map((entry) => entry.target);
    if (!cards.length) return;
    for (const card of cards) watcher.unobserve(card);
    const started = generation;
    const saved = await loadKnown();
    if (started !== generation) return;
    for (const card of cards) {
      const url = card.getAttribute("href");
      const host = hostOf(url);
      if (host && needsShareImage(saved.get(host))) request(host, url, false);
    }
  }

  async function urlFor(pageUrl) {
    const host = hostOf(pageUrl);
    if (!host) return null;
    // Read again each time: background.js can save a newer screenshot while this page is open
    const read = () => withStore("readonly", (store) => store.get(host)).catch(() => null);
    let record = await read();
    if (!record?.blob && needsShareImage(record)) {
      await request(host, pageUrl, true);
      record = await read();
    }
    if (!record?.blob) return null;
    const cached = urls.get(host);
    if (cached?.capturedAt === record.capturedAt) return cached.url;
    if (cached) URL.revokeObjectURL(cached.url);
    const url = URL.createObjectURL(record.blob);
    urls.set(host, { url, capturedAt: record.capturedAt });
    return url;
  }

  function hide() {
    clearTimeout(timer);
    current = null;
    if (el.classList.contains("show")) hiddenAt = Date.now();
    el.classList.remove("show");
  }

  return {
    show(anchor, pageUrl) {
      clearTimeout(timer);
      current = anchor;
      const warm = el.classList.contains("show") || Date.now() - hiddenAt < WARM_MS;
      timer = setTimeout(
        async () => {
          const url = await urlFor(pageUrl);
          if (!url || current !== anchor) return;
          img.src = url;
          await img.decode().catch(() => {});
          if (current !== anchor) return;
          position(anchor);
          el.classList.add("show");
        },
        warm ? WARM_DELAY_MS : SHOW_DELAY_MS
      );
    },
    hide,
    // Watches these cards: the ones on screen get their share image before a hover
    watch(cards) {
      observer?.disconnect();
      observer = new IntersectionObserver(onCardsVisible, { rootMargin: "200px 0px" });
      for (const card of cards) observer.observe(card);
    },
    // After the setting was turned off or the saved previews were deleted
    forget() {
      hide();
      generation++;
      observer?.disconnect();
      observer = null;
      for (const job of queue.splice(0)) job.resolve(null);
      requests.clear();
      known = null;
      knownLoad = null;
      for (const { url } of urls.values()) URL.revokeObjectURL(url);
      urls.clear();
    },
  };
}
