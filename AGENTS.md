# Working on the Hplay website

The site for the Hplay app, served by GitHub Pages from `main`. The app itself, and the full
guide (`AGENTS.md`, `docs/ARCHITECTURE.md`), live in the separate Hplay repository.

- **Some pages are generated; do not hand-edit them.** `changelog.html` is written by the app
  repo's `tools/build_changelog.py`, which also stamps the current version into `index.html`,
  `license.html`, `feedback.html` and `gift.html`. Change the app's changelog and rerun it.
- **The site never runs ahead of the app.** Changes that describe a version not yet published
  go on a branch named `v<version>-site` and are merged once that version is live.
- **`wrapped.html` is half of a pair.** The app opens it in a frame and hands in covers with
  `postMessage({type:'hplay-covers', covers, songs, artists})` after the page posts
  `hplay-wrapped-ready`. Use `sleeveFor(d, i)`, `artFor.song(title)` and `artFor.artist(name)`;
  anything missing falls back to the house sleeves. The numbers come only from the link's `#`.
  It can be redesigned every year without an app update, as long as that contract holds.
- **Privacy wording is checked.** What the app fetches is listed on the home page and in its
  FAQ; the app repo's `tools/check_claims.py` scans this site for overstatements.
- Plain HTML, CSS and JavaScript, no build step. British spelling in prose.
