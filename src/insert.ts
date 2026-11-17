export type InsertResult = "inserted" | "replaced" | "not-found";

/**
 * Inserts Markdown into the comment box of GitHub's "Finish your review" dialog.
 *
 * This function is injected into the page via chrome.scripting.executeScript, so it
 * must not reference any outer variables or imports (only the function body is serialized).
 *
 * @param markdown The Markdown to insert
 * @param previous The Markdown inserted last time; replaced if it's still in the comment box
 */
export function insertIntoReviewBox(markdown: string, previous: string | null): InsertResult {
  if (location.hostname !== "github.com") return "not-found";

  const isVisible = (el: Element): boolean => (el as HTMLElement).offsetParent !== null;

  // New UI: a role="dialog" containing the "Finish your review" heading and a comment box
  const findInDialog = (): HTMLTextAreaElement | null => {
    const dialogs = document.querySelectorAll<HTMLElement>('[role="dialog"], dialog[open]');
    for (const dialog of dialogs) {
      if (!isVisible(dialog) || !dialog.textContent?.includes("Finish your review")) continue;
      const ta = dialog.querySelector<HTMLTextAreaElement>("textarea");
      if (ta && isVisible(ta)) return ta;
    }
    return null;
  };

  // Legacy UI: the textarea inside the review popover
  const findLegacy = (): HTMLTextAreaElement | null => {
    const ta = document.querySelector<HTMLTextAreaElement>("textarea#pull_request_review_body");
    return ta && isVisible(ta) ? ta : null;
  };

  const textarea = findInDialog() ?? findLegacy();
  if (!textarea) return "not-found";

  textarea.focus();

  // If the previously inserted GIF is still there, select and replace it; otherwise append to the end
  const prevIndex = previous ? textarea.value.lastIndexOf(previous) : -1;
  let text = markdown;
  if (prevIndex >= 0 && previous) {
    textarea.setSelectionRange(prevIndex, prevIndex + previous.length);
  } else {
    const end = textarea.value.length;
    textarea.setSelectionRange(end, end);
    if (textarea.value.trim() !== "") text = (textarea.value.endsWith("\n") ? "\n" : "\n\n") + markdown;
  }

  // execCommand("insertText") updates React's state and keeps the undo history
  const before = textarea.value;
  const ok = document.execCommand("insertText", false, text);
  if (!ok || textarea.value === before) {
    // Fallback: set the value via the native setter and fire an input event so React picks it up
    const start = textarea.selectionStart;
    const next = before.slice(0, start) + text + before.slice(textarea.selectionEnd);
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
    setter?.call(textarea, next);
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
    textarea.setSelectionRange(start + text.length, start + text.length);
  }

  return prevIndex >= 0 ? "replaced" : "inserted";
}
