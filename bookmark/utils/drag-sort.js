// Drag and drop for bookmark cards and for categories (folder titles).
// While the user drags, the element moves in the DOM, so the list already shows
// where it will land. On drop, the bookmark or folder moves.
// Cards: reorder inside a folder, or move to another folder. A collapsed folder
// title is a drop target too: the card goes to the end of that folder, and the
// folder opens after the pointer rests on it.
// Categories: drag a folder title to reorder it among the folders next to it.

const SPRING_OPEN_MS = 600;
const SLIDE_MS = 160;

const isCard = (el) => Boolean(el?.classList?.contains("bookmark"));
const isFolder = (el) => Boolean(el?.classList?.contains("folder"));

// Cards come before nested folders in a container, the same as the render order
function firstFolderChild(container) {
  for (const child of container.children) {
    if (isFolder(child)) return child;
  }
  return null;
}

// The last visible card: search hides cards with display: none, and their rect is all zeros
function lastCard(container) {
  let last = null;
  for (const child of container.children) {
    if (isCard(child) && child.getClientRects().length) last = child;
  }
  return last;
}

function isSliding(el) {
  return el.getAnimations().some((animation) => animation.playState === "running");
}

/**
 * @param {HTMLElement} root The element that holds all folders
 * @param {object} options
 * @param {(container: HTMLElement) => boolean} options.canDrop Whether items can go into this .childContainer
 * @param {(id: string, parentId: string, index: number|undefined, from: {parentId: string, index: number}) => void} options.onMove
 * @param {(title: HTMLElement) => void} options.onSpringOpen Opens a collapsed folder
 * @param {() => void} options.onEnd Runs after every drag, dropped or not
 */
export function enableDragSort(root, { canDrop, onMove, onSpringOpen, onEnd }) {
  // { kind: "card" | "folder", el, home, homeNext, overTitle, springTimer }
  let drag = null;

  function clearTitle() {
    if (!drag?.overTitle) return;
    drag.overTitle.classList.remove("is-drop-target");
    clearTimeout(drag.springTimer);
    drag.overTitle = null;
  }

  // Ends the drag. Runs on drop and on dragend, whichever comes first.
  function finish() {
    if (!drag) return;
    clearTitle();
    drag.el.classList.remove("is-dragging");
    document.body.classList.remove("is-dragging-card", "is-dragging-folder");
    drag = null;
    onEnd();
  }

  function setTitle(title) {
    if (drag.overTitle === title) return;
    clearTitle();
    drag.overTitle = title;
    title.classList.add("is-drop-target");
    if (title.classList.contains("collapsed")) {
      drag.springTimer = setTimeout(() => onSpringOpen(title), SPRING_OPEN_MS);
    }
  }

  // Moves the dragged element, then slides the others of its kind from their old place (FLIP)
  function place(container, before) {
    const { el } = drag;
    if (before === el || (el.parentElement === container && el.nextElementSibling === before)) return;
    const sameKind = drag.kind === "card" ? isCard : isFolder;
    const others = [];
    for (const parent of new Set([container, el.parentElement])) {
      for (const child of parent.children) {
        if (child !== el && sameKind(child)) others.push(child);
      }
    }
    const start = new Map(others.map((other) => [other, other.getBoundingClientRect()]));
    container.insertBefore(el, before);
    // Animate only what is on screen: a big folder can have thousands of cards
    const onScreen = (rect) => rect.bottom > 0 && rect.top < window.innerHeight;
    for (const other of others) {
      const from = start.get(other);
      const to = other.getBoundingClientRect();
      if (!onScreen(from) && !onScreen(to)) continue;
      const dx = from.left - to.left;
      const dy = from.top - to.top;
      if (dx || dy) {
        other.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "none" }], {
          duration: SLIDE_MS,
          easing: "cubic-bezier(0.2, 0.7, 0.3, 1)",
        });
      }
    }
  }

  function start(kind, el, event) {
    drag = { kind, el, home: el.parentElement, homeNext: el.nextElementSibling, overTitle: null, springTimer: 0 };
    // Fade the element after the browser took its drag image
    requestAnimationFrame(() => drag?.el.classList.add("is-dragging"));
    document.body.classList.add(kind === "card" ? "is-dragging-card" : "is-dragging-folder");
    event.dataTransfer.effectAllowed = kind === "card" ? "all" : "move";
  }

  root.addEventListener("dragstart", (event) => {
    const target = event.target instanceof Element ? event.target : null;
    const card = target?.closest(".bookmark");
    if (card) {
      if (!card.dataset.id || !card.dataset.index || !canDrop(card.parentElement)) return;
      start("card", card, event);
      // Keep the link data, so the card can also be dropped on the tab strip
      event.dataTransfer.setData("text/uri-list", card.href);
      event.dataTransfer.setData("text/plain", card.href);
      return;
    }
    const title = target?.closest(".folderTitle");
    const folder = title?.parentElement;
    if (!isFolder(folder) || !folder.dataset.id || !folder.dataset.index || !canDrop(folder.parentElement)) return;
    start("folder", folder, event);
    event.dataTransfer.setData("text/plain", title.textContent);
  });

  // The folder under the pointer that sits next to the dragged one (same parent)
  function siblingFolderAt(target) {
    let folder = target.closest(".folder");
    while (folder && folder.parentElement !== drag.home) {
      folder = folder.parentElement?.closest(".folder") || null;
    }
    return folder;
  }

  function dragOverFolder(event, target) {
    const folder = siblingFolderAt(target);
    if (!folder || folder === drag.el || isSliding(folder)) return;
    const rect = folder.getBoundingClientRect();
    const before = event.clientY < rect.top + rect.height / 2;
    place(drag.home, before ? folder : folder.nextElementSibling);
  }

  function dragOverCard(event, target) {
    const title = target.closest(".folderTitle");
    if (title) {
      const container = title.parentElement.querySelector(":scope > .childContainer");
      if (!container || !canDrop(container)) return;
      setTitle(title);
      // An open folder shows the card at its start, right under the title
      if (!title.classList.contains("collapsed")) place(container, container.firstElementChild);
      return;
    }
    clearTitle();

    const card = target.closest(".bookmark");
    if (card) {
      if (card === drag.el || !root.contains(card) || !canDrop(card.parentElement) || isSliding(card)) return;
      const rect = card.getBoundingClientRect();
      const after = event.clientX > rect.left + rect.width / 2;
      place(card.parentElement, after ? card.nextElementSibling : card);
      return;
    }

    // Empty space after the last card of a folder: move the card to the end.
    // Gaps between cards are skipped, so the card does not jump while passing them.
    if (target.classList.contains("childContainer") && canDrop(target)) {
      const last = lastCard(target);
      const rect = last?.getBoundingClientRect();
      if (!rect || event.clientY > rect.bottom || (event.clientY > rect.top && event.clientX > rect.right)) {
        place(target, firstFolderChild(target));
      }
    }
  }

  root.addEventListener("dragover", (event) => {
    if (!drag) return;
    // Accept the drop anywhere in the list; it lands where the element is now
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    const target = event.target instanceof Element ? event.target : event.target?.parentElement;
    if (!target) return;
    if (drag.kind === "folder") dragOverFolder(event, target);
    else dragOverCard(event, target);
  });

  root.addEventListener("dragleave", (event) => {
    if (drag && !root.contains(event.relatedTarget)) clearTitle();
  });

  root.addEventListener("drop", (event) => {
    if (!drag) return;
    event.preventDefault();
    const { kind, el, home, homeNext, overTitle } = drag;
    const from = { parentId: home.dataset.folderId, index: Number(el.dataset.index) };
    const droppedInPlace = el.parentElement === home && el.nextElementSibling === homeNext;

    if (kind === "card" && overTitle?.classList.contains("collapsed")) {
      const container = overTitle.parentElement.querySelector(":scope > .childContainer");
      // The card leaves this view; the next render shows it in the folder
      home.insertBefore(el, drag.homeNext);
      finish();
      onMove(el.dataset.id, container.dataset.folderId, undefined, from);
      return;
    }

    // Back where it started: nothing moves. The neighbor's index below would point
    // past a folder (or card) between them and change the real order.
    if (droppedInPlace) {
      finish();
      return;
    }

    // Bookmark indexes count cards and folders together, so use the real index of
    // the neighbor of the same kind. Indexes are from before the move, which is
    // what bookmarks.move() expects.
    const sameKind = kind === "card" ? isCard : isFolder;
    const next = el.nextElementSibling;
    const prev = el.previousElementSibling;
    let index = kind === "card" ? 0 : from.index;
    if (sameKind(next)) index = Number(next.dataset.index);
    else if (sameKind(prev)) index = Number(prev.dataset.index) + 1;
    const parentId = el.parentElement.dataset.folderId;
    finish();
    onMove(el.dataset.id, parentId, index, from);
  });

  root.addEventListener("dragend", () => {
    if (!drag) return;
    // Cancelled or dropped outside the list: put it back
    drag.home.insertBefore(drag.el, drag.homeNext);
    finish();
  });

  return { isDragging: () => Boolean(drag) };
}
