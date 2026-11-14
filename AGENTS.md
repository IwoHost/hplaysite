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
- **The look is `site.css`**, shared by the home page, `changelog.html`, `license.html` and
  `gift.html`: Anton headlines tipped over with a red and cyan edge, marker notes, tape and
  tilted cards from the Google Play pictures; Archivo and IBM Plex, the green bands and the
  printed objects from Wrapped. `feedback.html` and `review.html` keep their own stylesheets
  (their class names are their own) with the same palette laid over them. One look, dark; there
  is no light theme. **Do not restyle `wrapped.html`**: the owner likes it as it is.
- **Nothing is loaded from anyone else.** Fonts are in `fonts/`; no Google Fonts, no CDN. The
  home page reads `latest.json` from the download host and the feedback form posts to its
  postbox when sent; that is all. (`wrapped.html` still loads its fonts from Google.)
- **Pictures of the app are photographs of the app.** `node tools/shots.js <Hplay/index.html>`
  drives the real app with the site's own demo tracks and writes `img/app/`. Run it when the
  app's look changes; never draw a mock-up. The widget picture is the app repo's own drawing
  (`tools/widget_mock.html`) and its caption says so.
- **Check with `node tools/contrast.js`** after changing a colour or a layout: contrast against
  the worst pixel behind each line, sideways scrolling at 320, 390 and 1440, target sizes,
  names and heading order. The accessibility section on the home page states what it measures,
  so keep the two true of each other. Put running text on a plain ground, not on a wash.
- **The FAQ is written twice**, on the page and in the structured data at the top of
  `index.html`. Change both together.
