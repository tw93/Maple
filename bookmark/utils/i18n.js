const browserLanguage = navigator.language.startsWith("zh") ? "zh" : "en";
const isZh = browserLanguage === "zh";

document.getElementById("searchInput").placeholder = isZh ? "搜索书签..." : "Search bookmarks...";

const isMac = navigator.platform.indexOf("Mac") !== -1;

const keyHint = isMac ? "Command" : "Ctrl";
const keyText = isZh
  ? `按住 ${keyHint} 可批量打开，点击可收起`
  : `Hold ${keyHint} + click to open all bookmarks, or click to collapse`;

const BestMatchTitle = isZh ? "按 Enter 打开选中项" : "Press Enter to open selected item";

const LastBestMatch = isZh ? "上次最佳匹配" : "Recent Matches";
const BestMatch = isZh ? "最佳匹配" : "Best Matches";

const EmptyBookmarkMessage = isZh ? "🍁 没有找到书签" : "🍁 No bookmarks found in your browser";

const ShowSearchWrapper = isZh ? "显示搜索框，试试 Ctrl + S" : "Show search box (Try Ctrl + S)";
const HideSearchWrapper = isZh ? "隐藏搜索框，试试 Ctrl + S" : "Hide search box (Try Ctrl + S)";

export {
  keyText,
  BestMatchTitle,
  LastBestMatch,
  BestMatch,
  EmptyBookmarkMessage,
  ShowSearchWrapper,
  HideSearchWrapper,
};
