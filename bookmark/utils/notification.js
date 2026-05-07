// Cached container — DOM lookup per show/hide is wasteful
let _container = null;
function getContainer() {
  if (_container && _container.isConnected) return _container;
  _container = document.querySelector("#notification-container");
  return _container;
}

export const Notification = {
  timer: null,
  show(message, hideTime = 0) {
    const container = getContainer();
    if (!container) return;
    container.textContent = message;
    container.classList.add("show");
    if (hideTime > 0) {
      if (this.timer) clearTimeout(this.timer);
      this.timer = setTimeout(() => {
        clearTimeout(this.timer);
        this.timer = null;
        this.hide();
      }, hideTime);
    }
  },
  hide() {
    const container = getContainer();
    if (!container) return;
    container.classList.remove("show");
  },
};
