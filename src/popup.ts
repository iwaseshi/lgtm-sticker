import { insertIntoReviewBox, type InsertResult } from "./insert.js";

const API = "https://lgtm-api.vercel.app/api/gifs/random";

/** Response from lgtm-api (only the fields we use are required). */
interface Gif {
  url: string;
  name?: string;
  smallUrl?: string;
  id?: string;
  slug?: string;
  mp4Url?: string;
  width?: number;
  height?: number;
  tags?: string[];
}

type Status = "loading" | "ok" | "err";

function $<T extends HTMLElement>(id: string, type: new () => T): T {
  const el = document.getElementById(id);
  if (!(el instanceof type)) throw new Error(`#${id} not found`);
  return el;
}

const ui = {
  status: $("status", HTMLDivElement),
  preview: $("preview", HTMLImageElement),
  name: $("name", HTMLDivElement),
  again: $("again", HTMLButtonElement),
};

function isGif(value: unknown): value is Gif {
  return typeof value === "object" && value !== null && typeof (value as Gif).url === "string";
}

async function fetchRandomGif(): Promise<Gif> {
  // Hit the API on every run so we get a different random GIF each time
  const res = await fetch(`${API}?t=${Date.now()}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data: unknown = await res.json();
  if (!isGif(data)) throw new Error("Unexpected response");
  return data;
}

// Same format as the site's "Random Gif" button
const toMarkdown = (gif: Gif): string => `![${gif.name || "LGTM"}](${gif.url})`;

async function copyText(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // Fallback for when the Clipboard API fails (e.g. the document isn't focused)
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
  }
}

// Remember the last inserted GIF so "Another GIF" can replace it while the popup stays open
let lastInserted: string | null = null;

/** Inserts the Markdown into the review comment box if the active tab shows GitHub's review dialog. */
async function insertIntoActiveTab(markdown: string): Promise<InsertResult> {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id === undefined) return "not-found";
    const [result] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: insertIntoReviewBox,
      args: [markdown, lastInserted],
    });
    const outcome = (result?.result as InsertResult | undefined) ?? "not-found";
    if (outcome !== "not-found") lastInserted = markdown;
    return outcome;
  } catch {
    // Do nothing on pages we can't inject into (e.g. chrome://)
    return "not-found";
  }
}

function setStatus(kind: Status, text: string): void {
  ui.status.className = kind === "loading" ? "" : kind;
  ui.status.textContent = text;
}

function showGif(gif: Gif): void {
  ui.preview.src = gif.smallUrl || gif.url;
  ui.preview.style.display = "inline-block";
  ui.name.textContent = gif.name ?? "";
}

async function run(): Promise<void> {
  setStatus("loading", "Loading…");
  ui.again.disabled = true;
  try {
    const gif = await fetchRandomGif();
    const md = toMarkdown(gif);
    await copyText(md);
    showGif(gif);
    const inserted = await insertIntoActiveTab(md);
    setStatus("ok", inserted === "not-found" ? "Copied ✓" : "Copied and pasted into the review ✓");
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    setStatus("err", `Failed: ${message}`);
  } finally {
    ui.again.disabled = false;
  }
}

ui.again.addEventListener("click", () => void run());
void run();
