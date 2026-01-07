// offscreen-detector.js
// Minimal ESM loader for your local HF model via Xenova Transformers.js

import { pipeline, env } from "./vendor/transformers/transformers.min.js";

let pipe = null;

// Allow reading packaged model files from chrome-extension://
env.allowLocalModels = true;

const MODEL_PATH = chrome.runtime.getURL("app/#modelname#-model");

// Tell background we’re alive as soon as the offscreen page loads
chrome.runtime.sendMessage(
  { source: "offscreen-detector", type: "READY" },
  () => { void chrome.runtime.lastError; }
);

function normalizeCategory(raw) {
  const k = String(raw || "").trim().toLowerCase();
  const table = {
    "normal": "Normal",
    "clean": "Normal",
    "non-toxic": "Normal",
    "profanity": "Profanity",
    "hate": "Hate Speech",
    "hate speech": "Hate Speech",
    "microaggression": "Microaggression",
    "derogatory": "Derogatory",
    "trolling": "Trolling"
  };
  return table[k] || raw;
}

async function getPipe() {
  if (pipe) return pipe;
  pipe = await pipeline("text-classification", MODEL_PATH, { topk: 1 });
  return pipe;
}

async function classify(text) {
  const p = await getPipe();
  const out = await p(text || "");
  const best = Array.isArray(out) ? out[0] : out;
  return { category: normalizeCategory(best.label), score: best.score };
}

// Message bridge with the background service worker
chrome.runtime.onMessage.addListener(async (msg) => {
  if (!msg || msg.target !== "offscreen-detector") return;

  try {
    if (msg.type === "warmup") {
      await getPipe();
      chrome.runtime.sendMessage({ source: "offscreen-detector", id: msg.id, ok: true, result: "ready" });
    } else if (msg.type === "classify") {
      const result = await classify((msg.payload && msg.payload.text) ? msg.payload.text : "");
      chrome.runtime.sendMessage({ source: "offscreen-detector", id: msg.id, ok: true, result });
    } else {
      chrome.runtime.sendMessage({ source: "offscreen-detector", id: msg.id, ok: false, error: "Unknown call" });
    }
  } catch (e) {
    chrome.runtime.sendMessage({ source: "offscreen-detector", id: msg.id, ok: false, error: String(e) });
  }
});

console.log("[offscreen] detector loaded");
