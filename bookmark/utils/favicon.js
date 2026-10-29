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
    faviconUrl = `https://www.google.com/s2/favicons?domain_url=${encodeURIComponent(url)}&sz=32`;
  } else {
    faviconUrl = `${chrome.runtime.getURL("/_favicon?")}pageUrl=${encodeURIComponent(url)}&size=32`;
  }

  // 缓存结果
  faviconCache.set(url, faviconUrl);
  return faviconUrl;
}

// 深色模式下 GitHub、Apple 这类黑色单色图标在深色卡片上看不见，加载后读一次像素，几乎全黑的才反相
const darkIconCache = new Map();

// data 是 getImageData 的 RGBA 数组，只看不透明像素
export function isDarkMonochromePixels(data) {
  let count = 0;
  let light = 0;
  let lumSum = 0;
  let chromaSum = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 128) continue;
    const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    count++;
    lumSum += lum;
    chromaSum += Math.max(r, g, b) - Math.min(r, g, b);
    if (lum > 120) light++;
  }
  if (count < 8) return false;
  return light / count < 0.08 && lumSum / count < 70 && chromaSum / count < 24;
}

function isDarkMonochrome(img) {
  const size = 16;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, size, size);
  return isDarkMonochromePixels(ctx.getImageData(0, 0, size, size).data);
}

export function markDarkFavicon(img) {
  const apply = (dark) => img.classList.toggle("favicon-dark", dark);
  if (darkIconCache.has(img.src)) {
    apply(darkIconCache.get(img.src));
    return;
  }
  img.addEventListener(
    "load",
    () => {
      let dark = false;
      try {
        dark = isDarkMonochrome(img);
      } catch {
        // Firefox 的图标来自 Google，跨域读不到像素，保持原样
      }
      darkIconCache.set(img.src, dark);
      apply(dark);
    },
    { once: true }
  );
}
