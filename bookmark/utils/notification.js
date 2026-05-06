export const Notification = {
  timer: null,
  /**
   * 展示 notification
   * @param {string} message notification message
   * @param {boolean} hideTime auto hide time
   */
  show(message, hideTime = 0) {
    const container = document.querySelector("#notification-container");
    container.style.transform = `translateX(-105%)`;
    container.textContent = message;
    container.style.transform = `translateX(0)`;
    if (hideTime > 0) {
      if (this.timer) {
        clearTimeout(this.timer);
      }
      this.timer = setTimeout(() => {
        clearTimeout(this.timer);
        this.hide();
      }, hideTime);
    }
  },
  /**
   * 移除 notification
   *
   */
  hide() {
    const container = document.querySelector("#notification-container");
    container.style.transform = `translateX(-105%)`;
  },
};
