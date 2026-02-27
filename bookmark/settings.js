// 设置页面的JavaScript逻辑
const SETTINGS_KEYS = {
  SEARCH_ENABLED: "MAPLE_SEARCH_ENABLED",
  TIPS_ENABLED: "MAPLE_TIPS_ENABLED",
  OPEN_IN_NEW_TAB: "MAPLE_OPEN_IN_NEW_TAB",
  KEEP_PANEL_OPEN: "MAPLE_KEEP_PANEL_OPEN",
};

// 获取DOM元素
const searchEnabledCheckbox = document.getElementById("searchEnabled");
const tipsEnabledCheckbox = document.getElementById("tipsEnabled");
const openInNewTabCheckbox = document.getElementById("openInNewTab");
const keepPanelOpenCheckbox = document.getElementById("keepPanelOpen");
const backBtn = document.getElementById("backBtn");

// 国际化支持
const browserLanguage = navigator.language.startsWith("zh") ? "zh" : "en";
const isZh = browserLanguage === "zh";

// 设置页面文本
const texts = {
  title: isZh ? "设置" : "Settings",
  backBtn: isZh ? "← 返回" : "← Back",
  searchFeatureTitle: isZh ? "启用搜索功能" : "Search Functionality",
  searchFeatureDesc: isZh
    ? "开启后可以使用搜索框搜索书签，关闭后将隐藏搜索相关功能"
    : "Enable search box to quickly find bookmarks. When disabled, all search features will be hidden.",
  tipsFeatureTitle: isZh ? "显示悬停提示" : "Hover Tooltips",
  tipsFeatureDesc: isZh
    ? "鼠标悬停在书签上时显示完整标题，关闭后将不显示悬停提示"
    : "Display full bookmark titles when hovering. Turn off to disable all tooltip notifications.",
  openInNewTabTitle: isZh ? "新标签页打开" : "Open in New Tab",
  openInNewTabDesc: isZh
    ? "开启后点击书签将在新标签页打开，关闭后在当前标签页打开"
    : "Open bookmarks in a new tab. Turn off to open in the current tab.",
  keepPanelOpenTitle: isZh ? "点击后保持面板" : "Keep Panel Open",
  keepPanelOpenDesc: isZh
    ? "开启后点击书签会在后台标签页打开，并尽量保持面板不自动关闭"
    : "Keep the panel open after clicking by opening bookmarks in background tabs.",
  versionText: "Maple Bookmarks v1.17",
};

// 应用国际化文本
function applyI18n() {
  document.getElementById("title").textContent = texts.title;
  document.getElementById("backBtn").textContent = texts.backBtn;
  document.getElementById("searchFeatureTitle").textContent = texts.searchFeatureTitle;
  document.getElementById("searchFeatureDesc").textContent = texts.searchFeatureDesc;
  document.getElementById("tipsFeatureTitle").textContent = texts.tipsFeatureTitle;
  document.getElementById("tipsFeatureDesc").textContent = texts.tipsFeatureDesc;
  document.getElementById("openInNewTabTitle").textContent = texts.openInNewTabTitle;
  document.getElementById("openInNewTabDesc").textContent = texts.openInNewTabDesc;
  document.getElementById("keepPanelOpenTitle").textContent = texts.keepPanelOpenTitle;
  document.getElementById("keepPanelOpenDesc").textContent = texts.keepPanelOpenDesc;
  document.getElementById("versionText").textContent = texts.versionText;
}

// 立即应用国际化，避免文本闪烁
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", applyI18n);
} else {
  applyI18n();
}

// 加载设置
function loadSettings() {
  // 默认搜索功能是关闭的
  const searchEnabled = localStorage.getItem(SETTINGS_KEYS.SEARCH_ENABLED) === "true";
  searchEnabledCheckbox.checked = searchEnabled;

  // 默认 tips 功能是关闭的
  const tipsEnabled = localStorage.getItem(SETTINGS_KEYS.TIPS_ENABLED) === "true";
  tipsEnabledCheckbox.checked = tipsEnabled;

  // 默认在新标签页打开
  const openInNewTab = localStorage.getItem(SETTINGS_KEYS.OPEN_IN_NEW_TAB) !== "false";
  openInNewTabCheckbox.checked = openInNewTab;

  // 默认点击后自动关闭
  const keepPanelOpen = localStorage.getItem(SETTINGS_KEYS.KEEP_PANEL_OPEN) === "true";
  keepPanelOpenCheckbox.checked = keepPanelOpen;
}

// 保存设置
function saveSettings() {
  localStorage.setItem(SETTINGS_KEYS.SEARCH_ENABLED, searchEnabledCheckbox.checked.toString());
  localStorage.setItem(SETTINGS_KEYS.TIPS_ENABLED, tipsEnabledCheckbox.checked.toString());
  localStorage.setItem(SETTINGS_KEYS.OPEN_IN_NEW_TAB, openInNewTabCheckbox.checked.toString());
  localStorage.setItem(SETTINGS_KEYS.KEEP_PANEL_OPEN, keepPanelOpenCheckbox.checked.toString());
}

// 返回到主页面
function goBack() {
  window.close();
}

// 初始化
document.addEventListener("DOMContentLoaded", loadSettings);

// 事件监听器
searchEnabledCheckbox.addEventListener("change", saveSettings);
tipsEnabledCheckbox.addEventListener("change", saveSettings);
openInNewTabCheckbox.addEventListener("change", saveSettings);
keepPanelOpenCheckbox.addEventListener("change", saveSettings);
backBtn.addEventListener("click", goBack);
