// 扩展弹窗专用的高度初始化脚本（非模块，立即执行）
(function () {
  const h = localStorage.getItem("savedHeight");
  const s = localStorage.getItem("SHOW_SEARCH_BAR");
  const e = localStorage.getItem("MAPLE_SEARCH_ENABLED");
  let ih = 400;

  if (h && h > 30) {
    ih = Math.min(Math.max(parseInt(h), 200), 618);
    if (e === "true" && s === "true") ih = Math.min(Math.max(parseInt(h), 250), 618);
    else if (e === "true" && s !== "true") ih = Math.min(Math.max(parseInt(h) - 60, 200), 618);
    else if (e !== "true") ih = Math.min(Math.max(parseInt(h) - 80, 200), 618);
  } else {
    if (e === "true" && s === "true") ih = 520;
    else if (e === "true") ih = 460;
    else ih = 380;
  }

  // 立即设置CSS变量
  document.documentElement.style.setProperty("--popup-height", ih + "px");

  // 如果body已存在，也直接设置高度作为双重保险
  if (document.body) {
    document.body.style.height = ih + "px";
  }
})();
