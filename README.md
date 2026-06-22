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

## Alternative hosting (no GitHub Pages)
If you'd rather not enable Pages, point `STATUS_URL` in the embed at jsDelivr:
`https://cdn.jsdelivr.net/gh/garyricke/ftnn-status@main/ftnn-status.html`
— works with the same loader, but jsDelivr caches branch files at the edge for
up to 12h, so updates aren't instant unless you purge
(`https://purge.jsdelivr.net/gh/garyricke/ftnn-status@main/ftnn-status.html`).
**GitHub Pages is recommended** for near-instant updates.
