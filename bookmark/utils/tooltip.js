export const Tooltip = {
  /**
   * 展示 tooltip
   * @param {string} message tooltip message
   * @param {boolean} hideTime auto hide time
   */
  show(message, hideTime = 0) {
    const container = document.querySelector("#tooltip-container");
    container.style.transform = `translateX(-100%)`;
    container.textContent = message;
    container.style.transform = `translateX(0)`;
    if (hideTime > 0) {
      const timer = setTimeout(() => {
        clearTimeout(timer);
        this.hide();
      }, hideTime);
    }
  },
  /**
   * 移除 tooltip
   *
   */
  hide() {
    const container = document.querySelector("#tooltip-container");
    container.style.transform = `translateX(-100%)`;
  },
};
