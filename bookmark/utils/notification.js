// Cached container — DOM lookup per show/hide is wasteful
let _container = null;
function getContainer() {
  if (_container && _container.isConnected) return _container;
  _container = document.querySelector("#notification-container");
  return _container;
}

export const Notification = {
  timer: null,
  // True while a toast with a button (Undo) is up; hover tips must not replace it
  actionActive: false,
  // Runs when the current action toast ends without a click on its button
  pendingExpire: null,
  // hideTime 0 is a hover tip: it never covers an Undo toast. A notice with a
  // hideTime does, and the Undo it replaces can no longer run.
  show(message, hideTime = 0) {
    if (this.actionActive && hideTime === 0) return;
    if (this.actionActive) {
      this.actionActive = false;
      this.expirePending();
    }
    const container = getContainer();
    if (!container) return;
    container.classList.remove("has-action");
    container.textContent = message;
    container.classList.add("show");
    this.scheduleHide(hideTime);
  },
  showAction(message, actionText, onAction, hideTime = 5000, onExpire = null) {
    const container = getContainer();
    if (!container) return;
    // A new action toast replaces the old one, so the old action can no longer run
    this.expirePending();
    const text = document.createElement("span");
    text.className = "toast-text";
    text.textContent = message;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "toast-action";
    button.textContent = actionText;
    button.addEventListener(
      "click",
      () => {
        this.pendingExpire = null;
        this.hide(true);
        onAction();
      },
      { once: true }
    );
    container.replaceChildren(text, button);
    container.classList.add("show", "has-action");
    this.actionActive = true;
    this.pendingExpire = onExpire;
    this.scheduleHide(hideTime);
  },
  expirePending() {
    const onExpire = this.pendingExpire;
    this.pendingExpire = null;
    if (onExpire) onExpire();
  },
  scheduleHide(hideTime) {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    if (hideTime > 0) {
      this.timer = setTimeout(() => {
        this.timer = null;
        this.hide(true);
        this.expirePending();
      }, hideTime);
    }
  },
  // Hover tips call hide() too; only force hides a toast that has a button
  hide(force = false) {
    if (this.actionActive && !force) return;
    this.actionActive = false;
    const container = getContainer();
    if (!container) return;
    container.classList.remove("show");
    // A hidden Undo button must not run later (keyboard or a click on the faded toast)
    container.querySelector(".toast-action")?.setAttribute("disabled", "");
  },
};
