// Netlify Function (v2) — anonymous podcast page-engagement counters.
// No cookies, no IP storage, no personal data — just per-episode event tallies
// so we can answer "are people using the episode pages, or just listening?"
//
// POST body {ep:"ep5", event:"view"|"play"|"complete"|"chapter"|"deepdive"|
//            "scroll50"|"scroll90"|"time", seconds?:N}  -> records one event
// GET  -> returns aggregated JSON for the /status dashboard
//
// Storage: Netlify Blobs, APPEND-ONLY. Every event is written to its own unique
// key (no read-modify-write), so concurrent events can never clobber each other —
// counts stay exact. The key encodes everything the aggregate needs, so GET only
// lists keys (no per-blob value reads). If volume ever grows large, a periodic
// compaction step can fold old events into a summary blob.

import { getStore } from "@netlify/blobs";

const ALLOWED = new Set([
  "view", "play", "complete", "chapter", "deepdive", "scroll50", "scroll90", "time",
]);
const STORE = "ftnn-podcast-engagement";

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
    if (req.method === "POST") {
      let b = {};
      try { b = JSON.parse((await req.text()) || "{}"); } catch (_) {}
      const ep = String(b.ep || "").toLowerCase();
      const ev = String(b.event || "");
      if (!/^ep\d{1,3}$/.test(ep) || !ALLOWED.has(ev)) return json({ error: "bad params" }, 400);
      const secs = ev === "time" ? Math.max(0, Math.min(7200, Math.round(Number(b.seconds) || 0))) : 0;
      const uid = Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
      // key: e/<ep>/<event>/<seconds>/<uid> — everything needed is in the key
      await store.set(`e/${ep}/${ev}/${secs}/${uid}`, "1");
      return json({ ok: true });
    }

    if (req.method === "GET") {
      const episodes = {};
      let cursor;
      do {
        const page = await store.list({ prefix: "e/", cursor });
        for (const item of page.blobs || []) {
          const p = item.key.split("/"); // ["e", ep, event, secs, uid]
          if (p.length < 5) continue;
          const ep = p[1], ev = p[2], secs = Number(p[3]) || 0;
          const e = episodes[ep] || (episodes[ep] = {});
          if (ev === "time") {
            e.timeSum = (e.timeSum || 0) + secs;
            e.timeCount = (e.timeCount || 0) + 1;
          } else {
            e[ev] = (e[ev] || 0) + 1;
          }
        }
        cursor = page.cursor;
      } while (cursor);
      return json({ episodes, asOf: new Date().toISOString() });
    }

    return json({ error: "method not allowed" }, 405);
  } catch (e) {
    return json({ error: e.message });
  }
};
