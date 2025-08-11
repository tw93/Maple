// 设置页面的JavaScript逻辑
const SETTINGS_KEYS = {
  SEARCH_ENABLED: "MAPLE_SEARCH_ENABLED",
};

// 获取DOM元素
const searchEnabledCheckbox = document.getElementById("searchEnabled");
const backBtn = document.getElementById("backBtn");

// 国际化支持
const browserLanguage = navigator.language.startsWith("zh") ? "zh" : "en";
const isZh = browserLanguage === "zh";

// 设置页面文本
const texts = {
  title: isZh ? "设置" : "Settings",
  backBtn: isZh ? "← 返回" : "← Back",
  searchFeatureTitle: isZh ? "启用搜索功能" : "Enable Search Feature",
  searchFeatureDesc: isZh
    ? "开启后可以使用搜索框搜索书签，关闭后将隐藏搜索相关功能"
    : "When enabled, you can use the search box to search bookmarks. When disabled, search-related features will be hidden.",
};

// 应用国际化文本
function applyI18n() {
  document.getElementById("title").textContent = texts.title;
  document.getElementById("backBtn").textContent = texts.backBtn;
  document.getElementById("searchFeatureTitle").textContent = texts.searchFeatureTitle;
  document.getElementById("searchFeatureDesc").textContent = texts.searchFeatureDesc;
}

// 加载设置
function loadSettings() {
  // 默认搜索功能是关闭的
  const searchEnabled = localStorage.getItem(SETTINGS_KEYS.SEARCH_ENABLED) === "true";
  searchEnabledCheckbox.checked = searchEnabled;
}

// 保存设置
function saveSettings() {
  localStorage.setItem(SETTINGS_KEYS.SEARCH_ENABLED, searchEnabledCheckbox.checked.toString());

  // 发送消息给popup页面，通知设置已更改
  if (typeof chrome !== "undefined" && chrome.runtime) {
    chrome.runtime
      .sendMessage({
        action: "settingsChanged",
        searchEnabled: searchEnabledCheckbox.checked,
      })
      .catch(() => {
        // 忽略错误，可能popup没有打开
      });
  }
}

// 返回到主页面
function goBack() {
  window.close();
}

// 事件监听器
searchEnabledCheckbox.addEventListener("change", saveSettings);
backBtn.addEventListener("click", goBack);

// 初始化
document.addEventListener("DOMContentLoaded", function () {
  applyI18n();
  loadSettings();
});

// 为了兼容直接打开设置页面的情况
window.addEventListener("load", function () {
  applyI18n();
  loadSettings();
});
