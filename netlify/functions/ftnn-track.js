// Netlify Function (v2) — anonymous podcast page-engagement counters.
// No cookies, no IP storage, no personal data — just per-episode event tallies
// so we can answer "are people using the episode pages, or just listening?"
//
// POST body {ep:"ep5", event:"view"|"play"|"complete"|"chapter"|"deepdive"|
//            "scroll50"|"scroll90"|"time", seconds?:N}  -> increments a counter
// GET  -> returns the aggregated JSON for the /status dashboard
//
// Storage: Netlify Blobs (auto-configured for v2 functions; no external service, no keys).

import { getStore } from "@netlify/blobs";

const ALLOWED = new Set([
  "view", "play", "complete", "chapter", "deepdive", "scroll50", "scroll90", "time",
]);
const STORE = "ftnn-podcast-engagement";
const KEY = "agg";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
};

const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: cors });

export default async (req) => {
  if (req.method === "OPTIONS") return new Response("", { status: 204, headers: cors });

  let store;
  try {
    store = getStore(STORE);
  } catch (e) {
    return json({ error: "blobs unavailable: " + e.message, episodes: {} });
  }

  try {
    if (req.method === "GET") {
      const data = (await store.get(KEY, { type: "json" })) || { episodes: {} };
      return json({ ...data, asOf: new Date().toISOString() });
    }

    if (req.method === "POST") {
      let b = {};
      try { b = JSON.parse((await req.text()) || "{}"); } catch (_) {}
      const ep = String(b.ep || "").toLowerCase();
      const ev = String(b.event || "");
      if (!/^ep\d{1,3}$/.test(ep) || !ALLOWED.has(ev)) return json({ error: "bad params" }, 400);
      const secs = ev === "time" ? Math.max(0, Math.min(7200, Number(b.seconds) || 0)) : 0;

      // compare-and-set with jittered retry so concurrent increments don't clobber each other
      const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
      for (let attempt = 0; attempt < 25; attempt++) {
        const res = await store.getWithMetadata(KEY, { type: "json" });
        const data = (res && res.data) || { episodes: {} };
        const etag = res && res.etag;
        if (!data.episodes[ep]) data.episodes[ep] = {};
        const e = data.episodes[ep];
        if (ev === "time") {
          e.timeSum = (e.timeSum || 0) + secs;
          e.timeCount = (e.timeCount || 0) + 1;
        } else {
          e[ev] = (e[ev] || 0) + 1;
        }
        data.updatedAt = new Date().toISOString();
        try {
          const w = await store.setJSON(KEY, data, etag ? { onlyIfMatch: etag } : { onlyIfNew: true });
          if (!w || w.modified !== false) return json({ ok: true });
        } catch (_) { /* conflict or transient — retry */ }
        await sleep(15 + Math.floor(Math.random() * 60) * (1 + attempt * 0.15));
      }
      return json({ ok: true, note: "retry-exhausted" });
    }

    return json({ error: "method not allowed" }, 405);
  } catch (e) {
    return json({ error: e.message });
  }
};
