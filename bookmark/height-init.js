// 扩展弹窗专用的高度初始化脚本（非模块，立即执行）
(function () {
  const h = localStorage.getItem("savedHeight");
  const e = localStorage.getItem("MAPLE_SEARCH_ENABLED");
  const parsedHeight = Number.parseInt(h, 10);
  let ih = 400;

  if (Number.isFinite(parsedHeight) && parsedHeight > 30) {
    ih = Math.min(Math.max(parsedHeight, 200), 618);
  } else {
    if (e === "true") ih = 460;
    else ih = 380;
  }

  // 立即设置CSS变量
  document.documentElement.style.setProperty("--popup-height", ih + "px");

  // 如果body已存在，也直接设置高度作为双重保险
  if (document.body) {
    document.body.style.height = ih + "px";
  }
})();
