// 弹窗首帧尺寸初始化（非模块，立即执行）
(function () {
  var width = "408px";
  var height = "520px";

  function applySize(el) {
    if (!el) return;
    el.style.width = width;
    el.style.minWidth = width;
    el.style.maxWidth = width;
    el.style.height = height;
    el.style.minHeight = height;
    el.style.maxHeight = height;
  }

  applySize(document.documentElement);

  function applyBodySize() {
    if (!document.body) return;
    applySize(document.body);
    document.body.style.overflowX = "hidden";
    document.body.style.overflowY = "auto";
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", applyBodySize, { once: true });
  } else {
    applyBodySize();
  }
})();
