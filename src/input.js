export const INTERACTIVE_SHORTCUT_SELECTOR = [
  "a[href]",
  "area[href]",
  "button",
  "input",
  "select",
  "textarea",
  "option",
  "summary",
  "audio[controls]",
  "video[controls]",
  "iframe",
  "[contenteditable]:not([contenteditable='false'])",
  "[tabindex]:not([tabindex='-1'])",
  "[role='button']",
  "[role='link']",
  "[role='checkbox']",
  "[role='radio']",
  "[role='switch']",
  "[role='slider']",
  "[role='spinbutton']",
  "[role='textbox']",
  "[role='combobox']",
  "[role='listbox']",
  "[role='option']",
  "[role='menuitem']",
  "[role='menuitemcheckbox']",
  "[role='menuitemradio']",
  "[role='tab']",
  "[role='treeitem']",
  "[role='gridcell']",
].join(", ");

export function shouldIgnoreGlobalShortcut(target, canvas) {
  if (target === canvas) return false;
  return Boolean(
    target &&
      typeof target.closest === "function" &&
      target.closest(INTERACTIVE_SHORTCUT_SELECTOR),
  );
}
