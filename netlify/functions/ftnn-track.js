// Netlify Function — anonymous podcast page-engagement counters.
// No cookies, no IP storage, no personal data — just per-episode event tallies
// so we can answer "are people using the episode pages, or just listening?"
//
// POST  body {ep:"ep5", event:"view"|"play"|"complete"|"chapter"|"deepdive"|
//             "scroll50"|"scroll90"|"time", seconds?:N}  -> increments a counter
// GET   -> returns the aggregated JSON for the /status dashboard
//
// Storage: Netlify Blobs (automatic; no external service, no keys).

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

exports.handler = async function (event) {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: cors, body: "" };

  let store;
  try {
    const { getStore } = await import("@netlify/blobs");
    store = getStore(STORE);
  } catch (e) {
    return { statusCode: 200, headers: cors, body: JSON.stringify({ error: "blobs unavailable: " + e.message, episodes: {} }) };
  }

  try {
    if (event.httpMethod === "GET") {
      const data = (await store.get(KEY, { type: "json" })) || { episodes: {} };
      return { statusCode: 200, headers: cors, body: JSON.stringify({ ...data, asOf: new Date().toISOString() }) };
    }

    if (event.httpMethod === "POST") {
      let b = {};
      try { b = JSON.parse(event.body || "{}"); } catch (_) {}
      const ep = String(b.ep || "").toLowerCase();
      const ev = String(b.event || "");
      if (!/^ep\d{1,3}$/.test(ep) || !ALLOWED.has(ev)) {
        return { statusCode: 400, headers: cors, body: JSON.stringify({ error: "bad params" }) };
      }
      const data = (await store.get(KEY, { type: "json" })) || { episodes: {} };
      if (!data.episodes[ep]) data.episodes[ep] = {};
      const e = data.episodes[ep];
      if (ev === "time") {
        const s = Math.max(0, Math.min(7200, Number(b.seconds) || 0));
        e.timeSum = (e.timeSum || 0) + s;
        e.timeCount = (e.timeCount || 0) + 1;
      } else {
        e[ev] = (e[ev] || 0) + 1;
      }
      data.updatedAt = new Date().toISOString();
      await store.setJSON(KEY, data);
      return { statusCode: 200, headers: cors, body: JSON.stringify({ ok: true }) };
    }

    return { statusCode: 405, headers: cors, body: JSON.stringify({ error: "method not allowed" }) };
  } catch (e) {
    return { statusCode: 200, headers: cors, body: JSON.stringify({ error: e.message }) };
  }
};
