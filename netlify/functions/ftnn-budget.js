// Netlify Function — returns live FTNN maintenance-budget numbers from Clockify.
// The Clockify API key lives ONLY in a Netlify environment variable (CLOCKIFY_API_KEY)
// and is never sent to the browser. The /status page fetches this JSON.
//
// Required env var:   CLOCKIFY_API_KEY
// Optional env vars (have sensible defaults):
//   FTNN_PROJECT_NAME   default "FTNN 2"
//   FTNN_BLOCK_HOURS    default 67      (hours in the prepaid block)
//   FTNN_OVERAGE_HOURS  default 21      (hours rolled in "off the top" at approval)
//   FTNN_BLOCK_START    default 2026-02-25  (ISO date the block began)
//   FTNN_RATE           default 74.6268 ($/hour)

const BASE = "https://api.clockify.me/api/v1";

function isoHours(d) {
  if (!d) return 0;
  const m = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?/.exec(d);
  if (!m) return 0;
  return (+(m[1] || 0)) + (+(m[2] || 0)) / 60 + (+(m[3] || 0)) / 3600;
}

exports.handler = async function () {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  };
  try {
    const KEY = process.env.CLOCKIFY_API_KEY;
    if (!KEY) throw new Error("Missing CLOCKIFY_API_KEY env var");
    const PROJECT = process.env.FTNN_PROJECT_NAME || "FTNN 2";
    const BLOCK = Number(process.env.FTNN_BLOCK_HOURS || 67);
    const OVERAGE = Number(process.env.FTNN_OVERAGE_HOURS || 21);
    const START = process.env.FTNN_BLOCK_START || "2026-02-25";
    const RATE = Number(process.env.FTNN_RATE || 74.6268);

    const cf = async (path) => {
      const r = await fetch(BASE + path, { headers: { "X-Api-Key": KEY } });
      if (!r.ok) throw new Error("Clockify " + r.status);
      return r.json();
    };

    const ws = await cf("/workspaces");
    const wid = ws[0].id;

    let proj = null, page = 1;
    while (!proj) {
      const ps = await cf(`/workspaces/${wid}/projects?page=${page}&page-size=50&archived=false`);
      if (!ps.length) break;
      proj = ps.find((p) => p.name.trim().toLowerCase() === PROJECT.toLowerCase());
      if (ps.length < 50) break;
      page++;
    }
    if (!proj) throw new Error("Project not found: " + PROJECT);

    const used = isoHours(proj.duration);

    // --- hours by week (Monday-start) from individual time entries ---
    const weekStart = (iso) => {
      const dt = new Date(iso);
      const d = new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate()));
      const day = d.getUTCDay() || 7;
      d.setUTCDate(d.getUTCDate() - (day - 1));
      return d.toISOString().slice(0, 10);
    };
    const weekMap = {};
    try {
      const users = await cf(`/workspaces/${wid}/users`);
      for (const u of users) {
        let pg = 1;
        for (;;) {
          const batch = await cf(`/workspaces/${wid}/user/${u.id}/time-entries?project=${proj.id}&page=${pg}&page-size=200`);
          if (!batch.length) break;
          for (const e of batch) {
            const s = e.timeInterval && e.timeInterval.start;
            if (!s) continue;
            const h = isoHours(e.timeInterval.duration);
            const w = weekStart(s);
            weekMap[w] = (weekMap[w] || 0) + h;
          }
          if (batch.length < 200) break;
          pg++;
        }
      }
    } catch (e) { /* weekly is best-effort; meter still works */ }
    const byWeek = Object.keys(weekMap).sort().map((w) => ({ weekStart: w, hours: +weekMap[w].toFixed(2) }));

    const net = BLOCK - OVERAGE;
    const remaining = net - used;
    const pctUsed = net > 0 ? (used / net) * 100 : 0;
    const elapsedDays = Math.max(
      0,
      Math.floor((Date.now() - new Date(START + "T00:00:00Z").getTime()) / 86400000)
    );

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        project: PROJECT,
        blockHours: BLOCK,
        overageHours: OVERAGE,
        netHours: net,
        usedHours: +used.toFixed(2),
        remainingHours: +remaining.toFixed(2),
        pctUsed: +pctUsed.toFixed(1),
        rate: RATE,
        dollarsUsed: Math.round(used * RATE),
        dollarsRemaining: Math.round(remaining * RATE),
        blockStart: START,
        elapsedDays,
        byWeek,
        asOf: new Date().toISOString(),
      }),
    };
  } catch (e) {
    return { statusCode: 200, headers, body: JSON.stringify({ error: e.message }) };
  }
};
