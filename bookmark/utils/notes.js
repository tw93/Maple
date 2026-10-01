// Notes in chrome.storage.local, one key per item:
// - bookmark notes per URL ("MAPLE_NOTE:<url>"), so a note survives delete + Undo
// - category descriptions per folder id ("MAPLE_FOLDER_NOTE:<id>")
// One key per note keeps the popup and the sidebar from overwriting each other.

const NOTE_PREFIX = "MAPLE_NOTE:";
const FOLDER_PREFIX = "MAPLE_FOLDER_NOTE:";
const notes = new Map();
const folderNotes = new Map();

export async function loadNotes() {
  try {
    const all = await chrome.storage.local.get(null);
    notes.clear();
    folderNotes.clear();
    for (const [key, value] of Object.entries(all)) {
      if (typeof value !== "string") continue;
      if (key.startsWith(NOTE_PREFIX)) notes.set(key.slice(NOTE_PREFIX.length), value);
      else if (key.startsWith(FOLDER_PREFIX)) folderNotes.set(key.slice(FOLDER_PREFIX.length), value);
    }
  } catch (error) {
    console.warn("Failed to load notes:", error);
  }
}

export function getNote(url) {
  return notes.get(url) || "";
}

export function getFolderNote(folderId) {
  return folderNotes.get(String(folderId)) || "";
}

async function save(map, prefix, id, text) {
  const key = prefix + id;
  if (text.trim()) {
    map.set(id, text);
    await chrome.storage.local.set({ [key]: text });
  } else {
    map.delete(id);
    await chrome.storage.local.remove(key);
  }
}

export function saveNote(url, text) {
  return save(notes, NOTE_PREFIX, url, text);
}

export function saveFolderNote(folderId, text) {
  return save(folderNotes, FOLDER_PREFIX, String(folderId), text);
}

// Calls back with the URLs and folder ids whose notes changed (in this view or another)
export function onNotesChanged(callback) {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    const urls = [];
    const folderIds = [];
    for (const [key, change] of Object.entries(changes)) {
      let map;
      let list;
      let id;
      if (key.startsWith(NOTE_PREFIX)) {
        [map, list, id] = [notes, urls, key.slice(NOTE_PREFIX.length)];
      } else if (key.startsWith(FOLDER_PREFIX)) {
        [map, list, id] = [folderNotes, folderIds, key.slice(FOLDER_PREFIX.length)];
      } else {
        continue;
      }
      if (typeof change.newValue === "string") map.set(id, change.newValue);
      else map.delete(id);
      list.push(id);
    }
    if (urls.length || folderIds.length) callback(urls, folderIds);
  });
}
