# FTNN — Status & Open Items

A single, Git-backed status dashboard that auto-publishes to the `/status` page
on the FTNN Squarespace site. **Edit one file locally, push, and the live page
updates within ~1 minute.**

## Files
| File | What it is |
|------|------------|
| `ftnn-status.html` | **The source of truth.** The styled status fragment. This is the only file you edit to update the page. |
| `squarespace-embed.html` | The one-time loader to paste into the Squarespace `/status` Code Block. |
| `README.md` | This file. |

---

## One-time setup

### 1. Create the GitHub repo (public)
> A Pages-hosted repo is public. That's fine here — this page is meant to be
> seen on the public site. Keep your podcast audio, drafts, and client files in
> a *separate* (private) folder; only this `ftnn-status` folder goes in this repo.

```bash
cd /Users/garyricke/Documents/FTNN/ftnn-status
git init
git add .
git commit -m "FTNN status page: initial"
git branch -M main
# create an empty PUBLIC repo named "ftnn-status" on github.com first, then:
git remote add origin https://github.com/garyricke/ftnn-status.git
git push -u origin main
```

### 2. Turn on GitHub Pages
On github.com → your `ftnn-status` repo → **Settings → Pages** →
**Source: Deploy from a branch** → Branch **main**, folder **/ (root)** → Save.
After ~1 minute your file is live at:
`https://garyricke.github.io/ftnn-status/ftnn-status.html`

### 3. Wire up Squarespace (once)
1. Create a new page at **/status** (Pages → + → Blank).
2. Add a **Code Block**.
3. Open `squarespace-embed.html` and paste the whole thing into the Code Block (it's already wired to `garyricke/ftnn-status` — no edits needed). Save.

Done. The `/status` page now mirrors `ftnn-status.html`.

---

## Updating the status (the weekly rhythm)

```bash
cd /Users/garyricke/Documents/FTNN/ftnn-status
# 1. edit ftnn-status.html  (update the date + items)
# 2. push:
git add ftnn-status.html
git commit -m "Status update YYYY-MM-DD"
git push
```

Within ~1 minute, `/status` reflects the change. (The loader appends a
cache-buster, so visitors always get the latest.)

### How to edit `ftnn-status.html`
- **Date:** update the text inside `<strong class="fs-date">…</strong>`.
- **This week's focus:** edit the `<li>` items in the `.fs-week` block.
- **Add an item** to any section — copy this row and drop it into the card:
  ```html
  <div class="fs-item">
    <div><span class="pill is-active"><span class="pd"></span>In progress</span></div>
    <div class="fs-item-main">
      <h4>Item title</h4>
      <p>Short description of where it stands.</p>
      <span class="fs-next"><b>Next</b> the next step.</span>
    </div>
  </div>
  ```
- **Status pill classes:** `is-done` (green) · `is-active` (blue) · `is-next` (amber) · `is-blocked` (red).

---

## Real-time budget (Netlify function)

The budget card can show **live** Clockify hours without exposing the API key on
the public page. The key lives only in a Netlify environment variable; a small
function reads Clockify server-side and returns just the budget JSON.

**One-time setup:**
1. Go to netlify.com → **Add new site → Import an existing project** → pick the
   `garyricke/ftnn-status` GitHub repo. (Netlify reads `netlify.toml` and deploys
   `netlify/functions/ftnn-budget.js`.)
2. In the new site: **Site settings → Environment variables → Add** —
   `CLOCKIFY_API_KEY` = *(your Clockify API key)*. Redeploy.
   Optional overrides (defaults in parentheses): `FTNN_BLOCK_HOURS` (67),
   `FTNN_CARRYOVER_HOURS` (4, hours that remained on the prior account),
   `FTNN_OVERAGE_HOURS` (0), `FTNN_BLOCK_START` (2026-02-25), `FTNN_RATE` (74.6268),
   `FTNN_PROJECT_NAME` ("FTNN 2"). Net available = block − overage + carryover.
3. Your function URL is `https://<your-site>.netlify.app/.netlify/functions/ftnn-budget`
   — test it in a browser; it should return budget JSON.
4. In `squarespace-embed.html`, set `BUDGET_URL` to that URL and re-paste into the
   `/status` Code Block. Done — the budget card now updates live on every page load.

> The key is **never** sent to the browser. If `BUDGET_URL` is left as the
> placeholder, the page just shows the static snapshot baked into `ftnn-status.html`.

To change the budget assumptions (e.g. the overage), set the env vars above — no
code change needed. The static snapshot in `ftnn-status.html` is the fallback;
update those numbers when you refresh the page manually.

## Alternative hosting (no GitHub Pages)
If you'd rather not enable Pages, point `STATUS_URL` in the embed at jsDelivr:
`https://cdn.jsdelivr.net/gh/garyricke/ftnn-status@main/ftnn-status.html`
— works with the same loader, but jsDelivr caches branch files at the edge for
up to 12h, so updates aren't instant unless you purge
(`https://purge.jsdelivr.net/gh/garyricke/ftnn-status@main/ftnn-status.html`).
**GitHub Pages is recommended** for near-instant updates.
