const browserLanguage = navigator.language.startsWith("zh") ? "zh" : "en";
const isZh = browserLanguage === "zh";

document.getElementById("searchInput").placeholder = isZh ? "搜索书签..." : "Search Bookmarks...";

const isMac = navigator.platform.indexOf("Mac") !== -1;

const keyHint = isMac ? "Command" : "Ctrl";
const keyText = isZh
  ? `按住 ${keyHint} 可批量打开，点击可收起`
  : `Hold ${keyHint} and click to open all, Click to collapse.`;

const BestMatchTitle = isZh ? "按 Enter 打开选中项" : "Press Enter to open the selected item";

const LastBestMatch = isZh ? "上次最佳匹配" : "Last Best Match";
const BestMatch = isZh ? "最佳匹配" : "Best Match";

const EmptyBookmarkMessage = isZh ? "🍁 没有找到书签" : "🍁 No bookmarks in the current browser";

const ShowSearchWrapper = isZh ? "显示搜索框，试试 Ctrl + S" : "Show Search Box, Try Ctrl + S";
const HideSearchWrapper = isZh ? "隐藏搜索框，试试 Ctrl + S" : "Hide Search Box, Try Ctrl + S";

export {
  keyText,
  BestMatchTitle,
  LastBestMatch,
  BestMatch,
  EmptyBookmarkMessage,
  ShowSearchWrapper,
  HideSearchWrapper,
};
