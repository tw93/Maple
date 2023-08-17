export function createElement(type, className, textContent = "") {
  let element = document.createElement(type);
  element.className = className;
  element.textContent = textContent;
  return element;
}
