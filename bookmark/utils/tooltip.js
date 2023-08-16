import {createElement} from './element.js';

export const Tooltip = {
  /**
 * 为元素添加 tooltip
 * @param {HTMLElement} el 需要展示 tooltip 的元素
 * @param {string} message tooltip message
 */
  show(el, message) {
    el.style.position = "relative";
    const span = createElement("span", "tooltip", message);
    el.appendChild(span);
  },
  /**
   * 
   * @param {HTMLElement} el 需要移除 
   */
  hide(el) {
    el.style.position = "";
    const tooltip = el.querySelector(`.tooltip`);
    if (tooltip) {
      el.removeChild(tooltip);
    }
  }
}
