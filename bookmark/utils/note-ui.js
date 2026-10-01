// The info icon on each card does two jobs: hover shows the note (only the
// note, nothing else), click opens the note editor. The editor also holds
// "Delete bookmark".
import { ICONS } from "./icons.js";

const isZh = navigator.language.startsWith("zh");
const TEXT = isZh
  ? {
      placeholder: "这个网站是做什么的？",
      delete: "删除书签",
      done: "完成",
      close: "关闭",
      saved: "已保存",
    }
  : {
      placeholder: "What is this site for?",
      delete: "Delete bookmark",
      done: "Done",
      close: "Close",
      saved: "Saved",
    };

const SHOW_DELAY_MS = 120;
const SAVE_DELAY_MS = 400;

export function createNoteTooltip() {
  const el = document.createElement("div");
  el.className = "note-tooltip";
  el.setAttribute("role", "tooltip");
  document.body.appendChild(el);

  let timer = 0;

  // Below the icon, or above it when there is no room, and inside the window
  function position(anchor) {
    const margin = 8;
    const rect = anchor.getBoundingClientRect();
    // Measure at the left edge: at its last place the box may be squeezed narrower
    el.style.left = "0px";
    el.style.top = "0px";
    const width = el.offsetWidth;
    const height = el.offsetHeight;
    const left = Math.min(Math.max(margin, rect.left + rect.width / 2 - width / 2), window.innerWidth - width - margin);
    let top = rect.bottom + 6;
    if (top + height > window.innerHeight - margin) top = rect.top - height - 6;
    el.style.left = `${Math.round(left)}px`;
    el.style.top = `${Math.round(Math.max(margin, top))}px`;
  }

  function hide() {
    clearTimeout(timer);
    el.classList.remove("show");
  }

  return {
    // Without a note there is nothing to show; a click on the icon adds one
    show(anchor, note) {
      clearTimeout(timer);
      if (!note) {
        hide();
        return;
      }
      timer = setTimeout(() => {
        el.textContent = note.trim();
        position(anchor);
        el.classList.add("show");
      }, SHOW_DELAY_MS);
    },
    hide,
  };
}

/**
 * @param {object} options
 * @param {(url: string) => string} options.getNote
 * @param {(url: string, text: string) => Promise<void>} options.saveNote
 * @param {(bookmark: {id?: string, url: string}) => void} options.onDelete
 */
export function createNoteEditor({ getNote, saveNote, onDelete }) {
  const root = document.createElement("div");
  root.className = "note-editor";
  root.hidden = true;
  // Static markup only; all bookmark text goes in through textContent below
  root.innerHTML = `
    <div class="note-editor-backdrop"></div>
    <div class="note-editor-card" role="dialog" aria-modal="true">
      <div class="note-editor-head">
        <img class="favicon" alt="" />
        <div class="note-editor-heading">
          <div class="note-editor-name"></div>
          <div class="note-editor-title"></div>
        </div>
        <button type="button" class="note-editor-close">${ICONS.close}</button>
      </div>
      <textarea class="note-editor-text" rows="5" spellcheck="false"></textarea>
      <div class="note-editor-foot">
        <button type="button" class="note-editor-delete">${ICONS.trash}<span></span></button>
        <span class="note-editor-status" aria-live="polite"></span>
        <button type="button" class="note-editor-done"></button>
      </div>
    </div>`;
  document.body.appendChild(root);

  const card = root.querySelector(".note-editor-card");
  const favicon = root.querySelector(".favicon");
  const name = root.querySelector(".note-editor-name");
  const title = root.querySelector(".note-editor-title");
  const textarea = root.querySelector(".note-editor-text");
  const status = root.querySelector(".note-editor-status");
  const closeBtn = root.querySelector(".note-editor-close");
  const deleteBtn = root.querySelector(".note-editor-delete");
  const doneBtn = root.querySelector(".note-editor-done");

  textarea.placeholder = TEXT.placeholder;
  textarea.maxLength = 2000;
  closeBtn.setAttribute("aria-label", TEXT.close);
  closeBtn.title = TEXT.close;
  deleteBtn.querySelector("span").textContent = TEXT.delete;
  doneBtn.textContent = TEXT.done;

  let current = null;
  let saveTimer = 0;

  function flush() {
    clearTimeout(saveTimer);
    if (!current || textarea.value === current.saved) return;
    const bookmark = current;
    bookmark.saved = textarea.value;
    saveNote(bookmark.url, bookmark.saved)
      .then(() => {
        if (current === bookmark) status.textContent = TEXT.saved;
      })
      .catch((error) => console.warn("Failed to save note:", error));
  }

  function close() {
    if (!current) return;
    flush();
    current = null;
    root.classList.remove("open");
    setTimeout(() => {
      if (!current) root.hidden = true;
    }, 180);
  }

  textarea.addEventListener("input", () => {
    status.textContent = "";
    clearTimeout(saveTimer);
    saveTimer = setTimeout(flush, SAVE_DELAY_MS);
  });
  root.querySelector(".note-editor-backdrop").addEventListener("click", close);
  closeBtn.addEventListener("click", close);
  doneBtn.addEventListener("click", close);
  deleteBtn.addEventListener("click", () => {
    const bookmark = current;
    close();
    if (bookmark) onDelete(bookmark);
  });
  root.addEventListener("keydown", (event) => {
    // Keys typed here are not list shortcuts (Enter, arrows, Delete)
    event.stopPropagation();
    if (event.key === "Escape" || (event.key === "Enter" && (event.metaKey || event.ctrlKey))) {
      event.preventDefault();
      close();
    }
  });
  // The popup or sidebar can close before the save delay ends
  window.addEventListener("pagehide", flush);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flush();
  });
  // Keep focus inside the dialog
  card.addEventListener("focusout", (event) => {
    if (current && !card.contains(event.relatedTarget)) textarea.focus();
  });

  return {
    open(bookmark) {
      current = { ...bookmark, saved: getNote(bookmark.url) };
      favicon.src = bookmark.favicon || "";
      favicon.hidden = !bookmark.favicon;
      name.textContent = bookmark.name;
      title.textContent = bookmark.title && bookmark.title !== bookmark.name ? bookmark.title : bookmark.url;
      textarea.value = current.saved;
      status.textContent = "";
      root.hidden = false;
      requestAnimationFrame(() => root.classList.add("open"));
      textarea.focus();
      textarea.setSelectionRange(textarea.value.length, textarea.value.length);
    },
    close,
    isOpen: () => Boolean(current),
  };
}
