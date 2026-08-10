# Liminal Portfolio Developer Guide

This guide explains how this repository works and how to change it safely. It is written for someone who is new to JavaScript and web development.

You do **not** need to understand the WebGL mathematics to change ordinary portfolio copy, links, colors, work history, skills, or existing project text. Start with the green-risk edits below and move into the spatial code only when you deliberately want to change the gallery itself.

### Quick contents

- [Start, run, and validate](#1-start-here)
- [Repository map](#3-repository-map)
- [HTML, CSS, and JavaScript primer](#4-a-small-html-css-and-javascript-primer)
- [HTML structure](#5-indexhtml-the-semantic-source-of-truth)
- [CSS architecture](#6-stylescss-visual-architecture)
- [JavaScript behavior](#7-scriptjs-application-behavior)
- [WebGL gallery](#8-scenejs-the-spatial-gallery)
- [Common edit recipes](#10-common-edit-recipes)
- [Accessibility and fallbacks](#12-accessibility-and-progressive-enhancement)
- [Debugging](#14-debugging-guide)

## 1. Start here

### Run the site on macOS

Open Terminal, change to the repository folder, and run:

```sh
cd /path/to/joying-yang.github.io
./tools/serve.sh
```

Keep that Terminal window open. In a browser, visit:

```text
http://127.0.0.1:4173/
```

Use `127.0.0.1`, not `localhost`. The development server binds specifically to the IPv4 loopback address.

Stop the server with `Ctrl+C` in Terminal.

There is no automatic reload. After saving a file, refresh the browser. Use `Command+Shift+R` when you want to force a full refresh.

If port 4173 is already occupied, use another port:

```sh
./tools/serve.sh --port 4174
```

Then visit `http://127.0.0.1:4174/`.

The shell wrapper requires Python 3. If `python3` is unavailable, install it with Homebrew using `brew install python`.

### Windows compatibility

The original PowerShell server remains available:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File '.\tools\serve.ps1'
```

### Validate your changes

From the repository folder, run:

```sh
./tools/validate.sh
```

A successful result currently begins with:

```text
PASS: 5 HTML routes
```

The validator checks file references, fragments, duplicate IDs, project routes, JSON, XML, and a few architectural rules. It does not judge visual quality or fully parse JavaScript and CSS, so also test in a browser.

### Important before publishing

The current identity, education, work, projects, and skills are polished seed content because the original specification did not provide verified owner records. Replace and fact-check them before launch. Résumé, GitHub, and LinkedIn actions were intentionally omitted rather than filled with fake links; add them only when you have real public URLs.

### Change-risk map

| Risk | Typical changes | Recommended experience |
|---|---|---|
| Green | Copy, email, dates, tags, skill text, existing Work-stop text, theme variables | Safe for a beginner |
| Yellow | Adding a Work timeline stop, adding a project, changing layout spacing, changing motion timings | Follow the checklists in this guide |
| Red | Adding a top-level section, renaming internal section IDs, changing camera stops, projection math, history/state logic | Understand the coupled files and test every mode |

## 2. The shortest useful mental model

This is a dependency-free static website. There is no React runtime, Node.js, npm installation, compilation step, database, or server-side application.

The browser receives ordinary files and combines them:

```text
index.html       = all main page structure and most visible portfolio copy
styles.css       = layout, colors, responsive rules, 2D mode, and visual effects
content.js       = structured case-study data used by the project dialog
script.js        = interface state, events, navigation, accessibility, and DOM projection
scene.js         = the WebGL gallery, camera positions, geometry, and motion

scene.js projects each virtual frame's four corners onto the screen
                              ↓
script.js maps traveling and distant panels with a CSS matrix3d transform
                              ↓
the settled active panel returns to native layout at the same screen bounds
                              ↓
the real semantic HTML stays attached to the gallery and focused text stays sharp
```

The important design decision is that **WebGL does not draw the portfolio text**. The Education, Work, Projects, and Skills panels are real HTML. This keeps the content readable, focusable, scrollable, and available in 2D or without WebGL.

## 3. Repository map

| Path | Responsibility |
|---|---|
| [`index.html`](index.html) | Main page metadata, entrance, navigation, four portfolio sections, controls, and dialog shell |
| [`styles.css`](styles.css) | All shared visual styling, spatial panel styling, 2D layout, responsive rules, accessibility fallbacks, dialog, and standalone case-study styles |
| [`script.js`](script.js) | Main application behavior and interface state |
| [`scene.js`](scene.js) | Raw WebGL scene, camera motion, virtual panel locations, and 3D-to-screen projection |
| [`content.js`](content.js) | Project records used to generate the in-page case-study dialog |
| [`projects/<slug>/index.html`](projects/) | Real standalone case-study pages for direct links, refreshes, crawlers, and dialog fallback |
| [`assets/favicon.svg`](assets/favicon.svg) | Site icon used by pages and the manifest |
| [`assets/og-card.svg`](assets/og-card.svg) | Editable source artwork for the social preview card |
| [`assets/og-card.png`](assets/og-card.png) | Actual social preview image referenced by page metadata |
| `assets/flexcar_logo.png`, `pintos_logo.png`, `prove_logo.png`, `league_logo.png`, `orca_logo.png` | Local artwork used by the corresponding project cards; Orca represents Music Generation |
| [`assets/road_flagged.png`](assets/road_flagged.png) | Single illustrated Work timeline road whose three experience flagposts align with Tesla, Apple, and Meta |
| [`assets/kirbs-animated.gif`](assets/kirbs-animated.gif) | Decorative 512×512, 33-frame runner animated across the Work road |
| [`404.html`](404.html) | Not-found page served for missing paths |
| [`site.webmanifest`](site.webmanifest) | Install-style name, icon, and colors |
| [`sitemap.xml`](sitemap.xml) | Public URLs for search engines |
| [`robots.txt`](robots.txt) | Search-crawler rules and sitemap location |
| [`vercel.json`](vercel.json) | Optional clean URLs, trailing slashes, and production security headers for Vercel |
| [`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml) | Validated, allowlisted GitHub Pages deployment |
| [`tools/serve.sh`](tools/serve.sh) / [`tools/serve.py`](tools/serve.py) | macOS and cross-platform local static development server |
| [`tools/validate.sh`](tools/validate.sh) / [`tools/validate.py`](tools/validate.py) | macOS and cross-platform structural validation |
| [`tools/serve.ps1`](tools/serve.ps1) / [`tools/validate.ps1`](tools/validate.ps1) | Original Windows-compatible development tools |
| [`README.md`](README.md) | Short project summary and launch handoff notes |
| `DEVELOPER_GUIDE.md` | This document |

## 4. A small HTML, CSS, and JavaScript primer

### HTML supplies meaning and structure

An element usually has an opening tag, content, and a closing tag:

```html
<h2>Computer Science</h2>
```

Attributes provide extra information:

```html
<section id="education" class="content-panel" data-section="education">
```

- `id` is a unique page identifier. Links, JavaScript, and accessibility relationships use it.
- `class` groups elements for styling or behavior. Many elements may share a class.
- `data-*` stores an application-specific value that JavaScript can read.
- `hidden` normally removes an element from layout.
- `aria-*` attributes communicate semantics and state to assistive technology.
- `inert` makes an area non-interactive and prevents keyboard focus from entering it.

For text-only edits, change the words between tags and leave these structural attributes alone.

### CSS selects HTML and changes its presentation

This rule colors every element with `class="lede"`:

```css
.lede {
  color: var(--amber-copy);
}
```

This rule applies only when the body is in 2D mode:

```css
body[data-mode="2d"] .content-panel {
  position: relative;
}
```

Later rules generally win when two rules have equal specificity. A desktop change near the top of `styles.css` may therefore be overridden later by 2D, tablet, mobile, reduced-motion, forced-colors, or no-JavaScript rules.

### JavaScript listens and changes state

JavaScript connects user actions to page changes. A simplified pattern is:

```js
button.addEventListener('click', function () {
  body.dataset.mode = '2d';
});
```

The real code uses:

- Arrays such as `['education', 'work', 'projects', 'skills']`.
- Objects such as the central `state` object.
- Functions that group behavior.
- Event listeners for clicks, keys, wheels, touch, history, resize, and system preferences.
- Callbacks that run when a camera animation or file load finishes.

Both main JavaScript files are wrapped in an immediately invoked function expression, often called an IIFE:

```js
(function () {
  'use strict';
  // private code
})();
```

That wrapper prevents internal names from leaking into the global browser scope. The intentional global exceptions are `window.PORTFOLIO_PROJECTS` and `window.LiminalScene`.

## 5. `index.html`: the semantic source of truth

### Load order

At the bottom of `index.html`, the page loads:

```html
<script defer src="content.js"></script>
<script defer src="script.js"></script>
```

`defer` means the browser parses the HTML first, then runs the scripts in this order. `content.js` must run first because `script.js` reads its project records.

`scene.js` is intentionally absent here. `script.js` loads it later only when spatial mode is useful. Keep that lazy-loading behavior; the validator rejects a direct `scene.js` script tag.

### Page anatomy

The body starts with three functional values:

```html
<body data-state="gate" data-mode="3d" data-active="education">
```

- `data-state="gate"` means the entrance is active.
- `data-mode="3d"` requests the spatial presentation.
- `data-active="education"` identifies the selected section.

The major areas are:

1. `#scene`: decorative WebGL canvas.
2. `.atmosphere`: CSS grain, scanlines, vignette, and glows.
3. `#entry-gate`: introduction and entry controls.
4. `#experience`: persistent identity, navigation, content, and utilities.
5. `#portfolio-main`: the four semantic portfolio sections.
6. `.orientation`: previous/next controls.
7. `.utility-bar`: email, mode, and motion controls.
8. `#project-dialog`: modal case-study shell.
9. `#live-region`: screen-reader announcements.

### The four top-level sections

The internal identifiers are:

```text
education
work
projects
skills
```

Each identifier is repeated deliberately in several places:

```html
<a href="#education" data-section-link="education">...</a>
<section id="education" data-section="education">...</section>
```

It also appears in `script.js` and `scene.js`. Changing only one copy breaks navigation or spatial alignment. You can safely change the visible label “Education” without changing the internal identifier `education`.

Each section has two visual content layers:

- `.panel-teaser`: the short label shown when the panel is distant in the 3D gallery. It is decorative and `aria-hidden`.
- `.panel-scroll`: the complete semantic content shown when the section is active.

When changing a section’s message, remember to update its short teaser as well as its full content.

Education, Projects, and Skills divide their content into authored subpages at one physical gallery stop. Education page `0` contains the degree overview and page `1` contains Selected coursework and Organizations. Projects page `0` uses a three-card content-weighted mosaic, while page `1` uses a four-card 2×2 grid. Skills distributes twenty-four asset-backed technology nodes across three eight-item capability layers. These sections share `.content-panel--paged`, `.section-page-stage`, and `.section-page`. Spatial mode exposes one authored page at a time without an internal content scrollbar. Education and Projects use white arrow buttons outside the panel; Skills uses three labeled layer selectors inside the panel. The `.panel-page-count` reports the current authored page. In 2D and without JavaScript, every authored page appears in normal document order.

Work is deliberately different. It has one `.work-timeline-page` inside `#work-timeline`, no Work subpage arrows, and a fixed `01 / 01` header count. Three chronological experience flags—Tesla, Apple, and Meta—share one road, followed by a fourth Suggestions/Email contact post. These are simultaneous disclosures rather than separately paginated role articles.

### Authored pages and Work timeline stops

Education pages use sequential zero-based indices:

```html
<article class="section-page education-page is-selected" data-education-page-index="0">...</article>
<article class="section-page education-page" data-education-page-index="1">...</article>
```

Work uses an ordered list of disclosures instead of indexed role pages. Each stop keeps its trigger, details panel, and heading IDs connected:

```html
<li class="work-stop work-stop--tesla" data-work-stop data-work-company="Tesla">
  <button id="work-stop-tesla-trigger" type="button" data-work-stop-trigger
    aria-expanded="false" aria-controls="work-stop-tesla-panel">
    <span class="work-stop__action" aria-hidden="true">+</span>
  </button>
  <section id="work-stop-tesla-panel" data-work-stop-panel
    role="region" aria-labelledby="work-stop-tesla-title">
    <button class="work-stop__close" type="button" data-work-stop-close
      aria-label="Close Tesla experience details"><span aria-hidden="true">×</span></button>
    <h3 id="work-stop-tesla-title">Tesla</h3>
    ...
  </section>
</li>
```

The first three `<ol>` items and their DOM order are the employment chronology: Tesla (Summer 2022), Apple (Summers 2023 and 2024), then Meta (August 2025 to present). The fourth item is an open contact channel rather than another employer. The on-page instruction therefore says “Select a beacon to inspect a field record or send a suggestion,” and the list is labeled “Work experience timeline and suggestions contact.” There is no `data-role-index`, `data-road-step`, selected Work index, or generated role count. Each closed stop appears only as a circular plus beacon. Opening it replaces that small preview at the same anchor with its field-record or contact panel.

Projects paginate page wrappers rather than individual cards. The seven cards are ordered newest-first across two pages: Flexcar and PintOS (2024), Prove (2022), Tailorbird (2021), League Predictor and Music Generation (2020), then the editable project placeholder (2019). Ties retain their authored DOM order. Page `0` holds one feature flip card and two shorter flip cards:

```html
<div class="section-page project-page is-selected" data-project-page-index="0">
  <div class="project-card-grid project-card-grid--mosaic" aria-label="Selected project cards">
    <article class="project-card project-card--flip project-card--feature project-card--example"
      data-project-card data-project="example" data-project-title="Example project">
      <button class="project-card__flip-toggle" type="button" data-project-flip
        aria-controls="project-example-back" aria-expanded="false">...</button>
      <div class="project-card__surface">
        <div class="project-card__face project-card__face--front" id="project-example-front">...</div>
        <div class="project-card__face project-card__face--back" id="project-example-back">...</div>
      </div>
    </article>
    <article class="project-card project-card--flip project-card--compact ...">...</article>
    <article class="project-card project-card--flip project-card--compact ...">...</article>
  </div>
</div>
```

On page `0`, `.project-card-grid--mosaic` creates two equal-width columns and content-weighted `0.9fr / 1.1fr` rows. Flexcar's `.project-card--feature` spans both columns in the shallower top row because it has three resume bullets; PintOS and Prove share the slightly taller lower row. Page `1` adds `.project-card-grid--four`, which replaces those spans with four equal 2×2 cells for Tailorbird, League Predictor, Music Generation, and the 2019 placeholder. Every card uses the same title, summary, skill-chip, bullet, footer, and control typography; the modifier classes change only the footprint. Wide cards use the same horizontal internal structure as their smaller neighbors. On narrow projected page boxes, page `0` becomes three horizontal rows while page `1` remains a 2×2 grid. Between `768px` and `960px`, 2D mode stacks cards in one column; mobile and no-JavaScript layouts also reset all spans and use normal document flow.

The front face contains an eyebrow, project mark, semantic title, and `.project-card__tech` skill list. Flexcar and Prove visually hide that title because their wordmark images already contain the name; the retained `.sr-only` `<h3>` preserves heading and focus semantics. The other cards keep visible titles. Skill chips summarize technologies and technical practices actually evidenced by that card's resume bullets; when bullets change, update the chips with them instead of carrying tags over from another project. The back face contains a technical heading, one short summary, a semantic `.project-card__bullets` resume list, and a `.project-card__external` footer. Resume bullets use real `<ul>`/`<li>` markup; never place bare `<li>` elements inside a paragraph. The flip button deliberately sits outside `.project-card__surface`: this keeps one stable control available while either face is hidden and while the surface is moving.

Five cards use local PNGs inside `.project-card__mark--image`: Flexcar, PintOS, Prove, League Predictor, and Music Generation. Tailorbird and the editable 2019 card retain CSS-native `TB` and `P7` marks. Image wrappers remain `aria-hidden="true"` with empty image alternatives because each card still has a real `<h3>`, visible or screen-reader-only. `.project-card__mark--wordmark` provides the wider fit required by Flexcar and Prove; the Flexcar image is filtered white, Prove uses screen blending to hide its black plate, and Music Generation clips the square Orca artwork into a circle.

Flexcar, Prove, and Tailorbird use ordinary `.project-card__external` links to their official sites. PintOS, League Predictor, Music Generation, and the 2019 placeholder instead use non-interactive `<span class="project-card__external project-card__external--placeholder">` footers until real project destinations are available. Do not give a placeholder span an empty or `#` link merely to make it clickable. None of the seven cards has `data-open-project`, so they do not invoke the older in-page case-study dialog. Their `data-project` values are local card identifiers used to keep markup readable; they do not need to match older records in `content.js` unless you deliberately reconnect a card to that case-study system.

Skills keeps the same zero-based page convention as Education. It currently has pages `0` through `2`:

```html
<section class="section-page skill-page is-selected" data-skill-page-index="0">...</section>
```

Each Skills subpage contains a semantic `.skill-list` with eight `.skill-item` list items. The layers are Interface/Mobile, Application/Systems, and Data/Delivery. Wide landscape layouts use the same four-column by two-row matrix for every layer; narrow and portrait spatial layouts use two columns by four rows. There are no per-node coordinates, offsets, size tiers, or proficiency implications.

The layer selector buttons update `selectedSkillPage`, the visible page, the header counter, and the inspector summary. Every technology starts as a static descriptive card. In spatial mode, JavaScript progressively adds `role="button"`, keyboard focus, and `aria-pressed`; selecting a card sets `selectedSkillNode` and replaces the inspector summary with the technology type and practical context. In 2D and without JavaScript, all descriptions remain inline and the cards retain ordinary non-interactive semantics. Local logos remain decorative because every card has a visible text name.

The code advances entries or page wrappers in their HTML/DOM order; it does not sort by the numeric attribute value. Sequential zero-based values are a useful convention, but moving a page or article changes the carousel order. Every section stops at its endpoints and disables the unavailable previous or next button.

The repository still contains an optional case-study dialog and standalone case-study routes. If you connect an overview card to that older system by adding `data-open-project`, its slug must agree across every related file. For `threshold`, that relationship is:

```text
content.js object key          threshold
content.js slug                threshold
index.html data-project        threshold
index.html data-open-project   threshold
link path                      projects/threshold/index.html
directory                      projects/threshold/
```

### Attributes you should preserve

Do not remove these merely to change appearance:

- `id`
- `data-section`, `data-section-link`, and the indexed `data-*` attributes
- `aria-labelledby`, `aria-label`, `aria-current`, and `aria-hidden`
- `tabindex="-1"` on headings that receive programmatic focus
- `hidden` and initial `.is-selected` relationships
- `role="img"` and the descriptive labels on CSS-only illustrations
- `data-work-stop`, `data-work-company`, optional `data-work-label`, `data-work-stop-trigger`, `data-work-stop-panel`, `data-work-stop-close`, and each Work trigger/panel/heading ID relationship
- `data-project-card`, `data-project-flip`, each project face ID, and the matching toggle `aria-controls`
- the inner `<span>` or `<img>` in `.project-card__mark`; CSS uses the span for placeholder initials and `.project-card__mark--image` for local artwork

## 6. `styles.css`: visual architecture

### Theme variables

The safest site-wide visual edits are at the top of `styles.css`:

```css
:root {
  --void-0: #020307;
  --void-1: #07070c;
  --violet-strong: #d66bff;
  --violet-mid: #9a55b4;
  --violet-dim: rgba(214, 107, 255, 0.18);
  --amber-copy: #aaa56b;
  --text-primary: #e9e2ec;
  --text-muted: #8d8494;
  --focus: #f3b7ff;
  --panel-fill: rgba(5, 5, 10, 0.88);
}
```

The root also defines transition timings and the global font stack. `--motion-entry` and `--safe-bottom` are currently declared but not used, so editing them alone will have no visible effect.

Some violet and text colors are still hard-coded as `rgba(...)` or hex values. A complete recolor therefore requires searching for values such as `214, 107, 255`, not only changing the variables. WebGL colors in `scene.js` are separate again and use numbers from 0 to 1.

### State hooks shared with CSS and DevTools

Several body classes and data attributes expose JavaScript state. Most actively drive CSS; a few are currently diagnostic or reserved for future styling:

| Hook | Meaning and current use |
|---|---|
| `data-state="gate"` | Entrance is visible; actively styled |
| `data-state="entering"` | Entrance-to-Education movement is active; actively styled |
| `data-state="browsing"` | Main gallery is active; actively styled |
| `data-mode="3d"` | Spatial presentation requested; actively styled |
| `data-mode="2d"` | Linear document presentation requested; actively styled |
| `data-active="..."` | Mirrors the requested section for inspection/future styling; current CSS does not select it |
| `data-travel-phase="vista/depart/traverse/approach/idle"` | Exposes animation phase; current CSS uses `entering + depart` for the entrance handoff |
| `data-travel-direction="forward/backward"` | Exposes direction for inspection/future styling; current CSS does not select it |
| `.has-scene-projection` | HTML panels are currently mapped to WebGL frames; actively styled |
| `.is-transitioning` | Section-to-section movement is active; actively styled |
| `.is-native-focused` | The settled front-facing panel has transform-free text rendering; actively styled only while browsing and not traveling |
| `.reduce-motion` | Site motion override is active; actively styled |
| `html.no-js` | JavaScript has not initialized; show the semantic fallback |

Treat the actively styled names as part of the application contract. Renaming one on only the JavaScript or CSS side breaks state styling.

### Main CSS layers

The file is organized approximately like this:

1. Theme variables and global defaults.
2. Focus, hidden, screen-reader, and skip-link utilities.
3. Canvas and atmospheric effects.
4. Entrance gate.
5. Persistent gallery navigation and status.
6. Baseline panel layout.
7. Enhanced WebGL-projected panel overrides.
8. Education, Work, Projects, and Skills components.
9. Navigation controls, dialog, and case-study content.
10. First-class 2D presentation.
11. Standalone case-study pages.
12. Tablet, mobile, short-window, motion, contrast, and no-JavaScript fallbacks.

### Spatial panel dimensions

Every projected section now renders to the same responsive outer rectangle: approximately `75vw × 75vh`. A `2:1` maximum aspect ratio protects unusually ultrawide displays. Typical settled sizes are:

```text
1440 × 900 viewport  → 1080 × 675 panel
1024 × 768 viewport  →  768 × 576 panel
1920 × 1080 viewport → 1440 × 810 panel
```

The physical screen rectangle and the HTML source rectangle serve different purposes. `scene.js` uses `PANEL_VIEWPORT_WIDTH_RATIO` and `PANEL_VIEWPORT_HEIGHT_RATIO` to calculate the desired screen coverage. It converts that rectangle to world units using the `40°` camera field of view and `8.7`-unit focus distance. Every stop receives exactly the same world size. When the viewport aspect changes, `syncPanelGeometry()` updates the `STOPS` sizes and re-uploads each frame, fill, and motif buffer so the canvas border and HTML panel remain aligned.

The HTML projection source has a stable logical height of `700px`; its width is `700 × rendered panel aspect ratio`. `scene.js` sends that source size with every projection payload. `script.js` stores it in `--spatial-panel-width` and `--spatial-panel-height` on every section, then maps the source rectangle to the projected corners with an inline `matrix3d(...)`. The stable logical height preserves approximately the previous text scale while the responsive width creates substantially more horizontal room.

Do not change only the CSS fallback values. The active spatial dimensions come from `scene.js`, and changing only one layer can distort the panel or desynchronize the WebGL frame. To change the spatial coverage, edit the shared `PANEL_VIEWPORT_*_RATIO` constants in `scene.js` and test every viewport.

When the camera is idle and the active panel's projected corners form a flat screen-aligned rectangle, `script.js` also records its screen bounds in `--native-focus-left`, `--native-focus-top`, `--native-focus-width`, and `--native-focus-height`, then adds `.is-native-focused`. A tightly gated CSS rule applies those bounds and `transform: none` only while the body is browsing and is not `.is-transitioning`. This avoids browser font resampling while preserving exactly the same outer panel position. In browsers that support CSS `zoom`, the inner `.panel-scroll` uses `--native-focus-scale` and `--native-focus-content-height` to retain the traveling panel's text size, line wrapping, and scroll area through this renderer change. This is layout-level scaling, not a transform.

The inline projection matrix deliberately remains underneath this native rule. Adding `.is-transitioning` exposes it immediately at the start of the next journey, so the camera does not jump or wait for another frame. Do not replace the canonical-size lookup with `offsetWidth` or `offsetHeight`: while focused, those values describe the projected screen rectangle and would corrupt the next matrix after a resize.

JavaScript also controls these visual CSS custom properties while projecting:

- `--spatial-panel-width` and `--spatial-panel-height`: shared responsive HTML source rectangle.
- `--detail-opacity`: full panel content visibility.
- `--teaser-opacity`: distant label visibility.
- `--plane-fill`: panel background strength.

If DevTools shows these as inline styles, that is expected. Editing only their default CSS values will not override values supplied by the projection system.

### 2D mode

The `body[data-mode="2d"]` block is a complete alternate presentation:

- Normal body scrolling is restored.
- WebGL, atmosphere, spatial status, transition veil, and 3D previous/next controls are hidden.
- Navigation becomes sticky.
- All four semantic sections are shown in document flow.
- Every Education, Projects, and Skills authored page is expanded; Work remains one complete timeline because it has no subpages.
- Carousel buttons are hidden because all entries are already readable.
- The shared content column is capped at `1080px`, but section heights remain natural so accessible content is never clipped to `75vh`.

Use 2D mode as both an accessible presentation and a debugging tool. If content is correct in 2D but misplaced in spatial mode, the likely problem is projection, panel dimensions, or scene geometry rather than the HTML copy.

### Responsive behavior

- At `1199px` and narrower, identity and navigation compact, the panel recenters, and utility labels become visually hidden.
- At `767px` and narrower, navigation becomes a fixed bottom bar and the content fills most of the viewport.
- JavaScript disables DOM-to-WebGL panel projection below 768px, so mobile uses the simpler active-panel layout.
- At short desktop heights, vertical spacing tightens.
- At `prefers-reduced-motion: reduce`, CSS animation durations collapse.
- In forced-colors mode, decorative graphics disappear and system colors are used.
- With no JavaScript, all content becomes a readable linear document.

Always inspect both desktop and mobile after layout changes.

### Project logo marks and image assets

Five project cards use local PNG artwork. `.project-card__mark--image` removes the generated pseudo-element geometry and constrains its nested image with `object-fit`. `.project-card__mark--wordmark` supplies extra horizontal room for Flexcar and Prove. The Prove image is scaled because its opaque source contains large black margins, while `mix-blend-mode: screen` makes that black plate merge into the panel. Flexcar uses `filter: brightness(0) invert(1)` to render its transparent wordmark white. The Music Generation wrapper uses `border-radius: 50%` with hidden overflow to crop the square Orca asset into a circle. Forced-colors rules reset blending and the Flexcar filter so the source images remain legible.

Tailorbird and the editable 2019 card still use the original lightweight CSS marks. Their inner `<span>` provides the initials while shared pseudo-elements draw the geometry. To replace either one later, keep the outer sizing/alignment box, add `.project-card__mark--image`, replace the span with an `<img alt="">`, and add a project-specific fit rule only when the source artwork's padding or aspect ratio requires it. A remote image would also require an intentional update to the production Content Security Policy.

## 7. `script.js`: application behavior

### Initialization

At startup, `boot()`:

1. Replaces `html.no-js` with `html.js`.
2. Makes the gallery inert while the gate is active.
3. Applies saved motion and mode preferences.
4. Attaches event listeners.
5. Starts the decorative local clock.
6. Initializes Education and Project pagination, the Skills layer selector and node inspector, Work-stop disclosures, and project-card flip controls.
7. Starts lazy WebGL loading on the next animation frame.
8. Bypasses the entrance when the URL already contains a valid section hash or `?mode=2d`.

### The central state object

`state` is the single record of what the interface is doing:

| Property | Meaning |
|---|---|
| `entered` | Whether the visitor has passed the entrance |
| `active` | The requested destination; changes when navigation starts |
| `settled` | The camera’s last completed physical stop |
| `displayed` | The section whose full semantic content is currently exposed |
| `mode` | `2d` or `3d` |
| `reducedMotion` | Whether long movement should be skipped |
| `phase` | `gate`, `entering`, `idle`, `transitioning`, or `project` |
| `transitionId` | A token that prevents an old async callback from completing a newer transition |
| `sceneReady` | Whether WebGL initialized successfully |
| `sceneRetryNeeded` | Whether the spatial layer may be retried after context loss |
| `selectedEducationPage` | Current Education subpage index |
| `selectedProjectPage` | Current Projects subpage index |
| `selectedSkillPage` | Current Skills subpage index |
| `selectedSkillNode` | Selected technology node, or `null` when the inspector shows its layer summary |
| `returnFocus` | Element that receives focus when a case study closes |
| `dialogClosePending` | Prevents duplicate history operations while closing a dialog |

The difference between `active`, `settled`, and `displayed` is intentional.

Work does not need a `selectedRole` property because it is no longer a carousel. Each `.work-stop` temporarily stores its own requested/open state and animation token as `_workStopTarget`, `_workStopOpen`, and `_workStopToken`; these are implementation details attached to the DOM element, not authored HTML attributes.

For example, while moving from Work to Projects:

```text
active    = projects  (where the visitor asked to go)
settled   = work      (where the camera physically started)
displayed = work      (full content remains until the planned swap point)
```

Only after the trip completes does `settled` become `projects`. Collapsing these three values into one was avoided because it causes incorrect reverse travel, early focus changes, and content appearing in the wrong physical place.

### Entrance flow

`enterGallery()` changes the state to `entering`, disables the gate, exposes the visual shell, and calls `sceneController.enter()`.

- Spatial entry lasts 1150 ms in `scene.js`.
- A 1200 ms fallback timer in `script.js` switches to 2D if the spatial layer does not complete.
- Reduced-motion and 2D entry finish immediately or nearly immediately.
- Camera position and heading interpolate continuously from the gate pose, while panel opacity, fill, and teaser labels crossfade continuously.

The 1150 ms animation and 1200 ms fallback are coupled. If you make the entrance animation longer, increase the fallback with adequate margin or it can switch to 2D before the animation finishes.

### Section navigation flow

All section inputs eventually call `goToSection()`:

```text
nav click / previous / next / keyboard / wheel / swipe / browser history
                                  ↓
                          goToSection(id)
                                  ↓
                     sceneController.goTo(id)
                                  ↓
                       completion callback settle()
```

During spatial travel:

- Another transition is rejected so camera journeys cannot overlap.
- The main region becomes inert.
- Navigation controls become disabled.
- The URL can update immediately.
- Full HTML content swaps at a physical point in the journey.
- Focus and live-region announcements wait until the camera settles.

Forward content swaps at raw progress `0.84`; reverse swaps at `0.16`. Those complementary times represent the same canonical physical location when the animation is played backward.

### Input methods

Spatial mode supports:

- Left and right arrows for adjacent sections.
- Home and End for first and last sections.
- Previous/next buttons.
- Section navigation links.
- Accumulated wheel input with a threshold of 100.
- A 760 ms wheel cooldown.
- Horizontal swipes of at least 50 pixels.

Wheel navigation does not steal a gesture while the active `.panel-scroll` can still scroll in that direction. Keyboard shortcuts are ignored while the user is typing in an editable control.

### 2D behavior

`setMode()` switches mode, clears projection-specific inline styles, and safely cancels a spatial transition. When the change was explicitly triggered by the user, it also stores the preference and updates the URL; automatic fallbacks do not save a preference.

An `IntersectionObserver` watches normal 2D scrolling. It updates the active navigation item, document title, and URL hash based on the section occupying the reading area without adding a new history entry for every scroll change.

### Authored-page selectors

`cycleEducationPage()`, `cycleProjectPage()`, and `cycleSkillPage()` query their indexed pages, toggle `hidden` and `.is-selected`, update counters, and announce the change. Every paginated section clamps at its first and last page and disables the corresponding unavailable control. Work is absent from this list because it no longer changes pages.

`updateEducationPages()`, `updateProjectPages()`, and `updateSkillPages()` also handle presentation modes: spatial mode exposes only the selected authored page, while 2D mode removes `hidden` and `inert` so every page remains readable, searchable, and printable.

The page and entry totals are calculated from the matching indexed elements in `index.html`; there is no separate project-page count to maintain.

### Work-stop disclosures

`bindWorkStops()` finds `[data-work-stop]` elements only inside `#work-timeline`, initializes every panel closed, and attaches each `[data-work-stop-trigger]` click. Clicking a plus beacon first calls `closeWorkStops(stop, false)` to close every other stop, then opens the requested one. It also binds the real `[data-work-stop-close]` × button inside each panel; that button closes its record and returns focus to the corresponding plus beacon. This guarantees that at most one field-record panel is open.

Escape inside the timeline closes the open stop and returns focus to its trigger. A document-level `pointerdown` outside every `[data-work-stop]` calls `closeWorkStops(null, false)`, so clicking elsewhere also dismisses the record. Pointer activity inside a stop—including its trigger or panel—does not trigger that outside-close path.

`setWorkStop(stop, open, immediate)` is the single state and accessibility boundary. It synchronizes `.is-open`, the trigger's `aria-expanded`, and the panel's `hidden`, `inert`, and `aria-hidden` state. Its accessible-label fallback is deliberate:

```js
stop.dataset.workLabel || ((stop.dataset.workCompany || 'work') + ' experience details')
```

The function prefixes that result with “Show” or “Hide.” Normal employer stops omit `data-work-label`, producing labels such as “Show Tesla experience details.” The Suggestions stop sets `data-work-label="suggestions and email contact"`, producing “Show suggestions and email contact” instead of the misleading “Suggestions experience details.” If both attributes are absent, the final fallback is “work experience details.”

The panel shares the beacon's anchor and fades/scales from a 9px lower offset into its full rectangle over 210 ms; closing takes 150 ms. A per-stop token prevents a cancelled animation from completing over a newer request.

Reduced-motion mode and browsers without the Web Animations API use the same final states but apply them immediately. If reduced motion is enabled while a record is moving, `applyMotionPreference()` immediately settles every stop at its currently requested state.

Project-card face state is a separate layer from project-page state. `bindProjectCards()` installs the interactions once. On devices with a fine pointer, entering a card requests the back and leaving requests the front unless keyboard focus is still inside that card. The persistent `[data-project-flip]` button supplies the same action for click, touch, and keyboard users, and Escape returns an open card to its front. The Project page's Up/Down shortcut only handles events whose target is the page stage itself, so arrow-key activity inside a card or official external link does not unexpectedly change pages.

`requestProjectCardFace()` performs the visible transition as two 90-degree phases with the Web Animations API: the outgoing face hinges to 90 degrees, `setProjectCardFace()` swaps which face is available, and the incoming face hinges from -90 degrees to zero. The surface ends at `transform: none` rather than remaining rotated, which prevents the settled card text from being permanently GPU-resampled and looking blurry. Rapid hover changes cancel stale animations. With reduced motion, the function swaps faces immediately.

`setProjectCardFace()` keeps the visual and accessibility states synchronized. The inactive face receives `hidden`, `inert`, and `aria-hidden="true"`; the toggle updates `aria-expanded`, its label, and its visible Details/Front copy. `updateProjectPages()` resets cards on inactive pages so a project does not remain unexpectedly open after paging away and back. Without JavaScript, CSS lays both faces out in normal order and hides the nonfunctional flip buttons, so all project information remains available.

### Optional project dialog and browser history

This behavior applies only to links carrying `data-open-project`; the three current official flip-card links intentionally do not carry it, and the three pending-link footers are spans rather than links. When an internal case-study link is present and the browser supports `<dialog>`, it is progressively enhanced:

1. The native link remains in the HTML as a fallback.
2. JavaScript prevents ordinary navigation.
3. `content.js` data is converted to escaped HTML.
4. The native dialog opens.
5. `/projects/<slug>/` is pushed into browser history.
6. The close button receives focus.
7. Browser Back or closing the dialog restores the prior URL and returns focus to the original link.

If dialog support or history writing is unavailable, the real standalone link still works.

`escapeHtml()` is a safety boundary. It prevents case-study strings from being treated as HTML. If you put `<strong>` in a project data string, the modal will display the literal characters rather than bold text. Change the render template deliberately if rich markup is required.

### Preferences

The browser stores:

```text
liminal-mode    = 2d or 3d
liminal-motion  = reduced or full
```

The operating-system reduced-motion preference is honored unless the visitor explicitly chose a motion value.

Reset preferences in Chrome DevTools Console with:

```js
localStorage.removeItem('liminal-mode');
localStorage.removeItem('liminal-motion');
location.reload();
```

### Scene loading and failure recovery

`loadScene()` inserts `scene.js` dynamically and queues callbacks so it is loaded only once. `ensureScene()` connects it to the canvas.

If the scene file, WebGL context, or shaders cannot initialize, the site falls back to the complete 2D presentation.

If an already-running WebGL context is specifically lost, the recovery path does more: it destroys the failed controller, replaces the canvas for a possible retry, finishes any entrance in progress, switches to 2D, and announces the change to assistive technology.

Both initialization failure and later context loss are supported states, not fatal page errors.

## 8. `scene.js`: the spatial gallery

This is the most advanced file. It uses raw WebGL 1 with no Three.js, React Three Fiber, model files, textures, or external shaders.

### Coordinate system and stops

`STOPS` is the authored gallery map:

```js
education: {
  frame: [0, 0, 0],
  yaw: 0,
  size: [DEFAULT_PANEL_WORLD_WIDTH, DEFAULT_PANEL_WORLD_HEIGHT],
  camera: [0, 0, 8.7],
  target: [0, 0, 0]
}
```

- X is left/right.
- Y is up/down.
- Rooms farther into the gallery use increasingly negative Z.
- `frame` is the virtual panel center.
- `yaw` rotates the panel around the vertical axis in degrees.
- `size` is width and height in world units. Each stop starts with the same shared default, and `syncPanelGeometry()` recalculates that shared size whenever the viewport changes so every panel still occupies the same screen rectangle.
- `camera` is the viewer position at that stop.
- `target` is the point being viewed.
- `ORDER` defines Education → Work → Projects → Skills.

The entry record includes a `frame` value, but the current implementation uses its starting camera and target; because `entry` is excluded from `ORDER`, it is not a content plane.

### Keeping a focused panel flat

Each settled camera is 8.7 units in front of its panel, directly along the panel normal. That is why the focused HTML appears perpendicular rather than slanted.

If you change a frame or yaw, calculate the matching camera as:

```js
var radians = yaw * Math.PI / 180;
camera = [
  frame[0] + Math.sin(radians) * 8.7,
  frame[1],
  frame[2] + Math.cos(radians) * 8.7
];
target = frame.slice();
```

Changing only `frame`, `yaw`, `camera`, or `target` independently can reintroduce a slanted final view.

### WebGL setup

The vertex shader multiplies each 3D vertex by the view and perspective matrices. The fragment shader outputs one supplied RGBA color. The visual complexity comes from geometry and blending, not shader effects.

JavaScript generates arrays of XYZ coordinates and uploads them to static GPU buffers. Geometry includes:

- Floor, ceiling, and wall grid.
- Decorative route rails.
- Entrance portal.
- Section frames and dark fills.
- Section-specific line motifs.
- Ambient fragments and corridor frames.
- Deterministically seeded point beacons.

Lines are drawn with additive blending for glow. Panel fills temporarily use normal alpha blending and disabled depth writes. Draw order, blend mode, and depth state are coupled; changing them casually can make transparent objects hide one another or glow too strongly.

### Motion model

`render()` turns elapsed time into `raw` progress from 0 to 1. `softLinear(raw, 0.14)` provides smooth acceleration over the first 14%, a nearly linear middle, and smooth deceleration over the last 14%.

Position and viewing direction use the same progress value:

```js
camera = mix3(startCamera, endCamera, progress);
forward = interpolateDirection(startForward, endForward, progress, 1);
```

This shared, single sweep prevents the previous two-stage wobble.

Reverse navigation uses a canonical forward timeline evaluated from 1 back to 0. The camera does not turn around; it plays the forward physical trip backward, matching the intended “walking backward” behavior.

Default section duration is:

```text
one hop:       1120 ms
extra hop:     +220 ms each
maximum:       1560 ms
entry:         1150 ms
reduced motion: 0 ms
```

Selecting a non-adjacent section through the side navigation makes one direct endpoint-to-endpoint sweep, with a longer duration based on hop count. It does not stop at every intermediate panel.

`sampleRoute()` is a Catmull–Rom spline used to draw decorative rails. It is intentionally **not** the camera path. It previously caused overshoot and reversal when used for movement.

### Demand rendering and quality tiers

The scene requests frames only while animating, after resize, after visibility restoration, or after an explicit update. It does not run an endless animation loop while idle.

Viewport quality tiers are:

```text
mobile:  width < 768,  DPR cap 1.0
tablet:  width < 1200, DPR cap 1.25
desktop: otherwise,    DPR cap 1.5
```

The perspective field of view is 40 degrees. Mobile and tablet omit low-emphasis geometry and reduce point counts. A continuously animated visual effect would require keeping `requestAnimationFrame` alive and would increase battery and GPU use.

### The WebGL-to-HTML projection bridge

For every section, `emitProjection()`:

1. Builds the panel’s four 3D corners.
2. Multiplies them through the current view and perspective matrices.
3. Converts them to CSS-pixel coordinates.
4. Rejects panels behind the camera, extremely small panels, and panels far outside the viewport.
5. Sends corners, depth, emphasis, route position, direction, quality, and phase to `script.js`.

`script.js` then uses `quadMatrix()` to calculate a four-corner projective transform and assigns it as an inline `matrix3d(...)` on the real HTML section.

That matrix remains the renderer during the entrance, all forward and reverse travel, and for distant panels. Once a destination is idle, front-facing, and axis-aligned, `script.js` stages `.is-native-focused` and the panel's projected bounds. CSS then disables the active panel's transform while the scene is settled and uses layout zoom internally to preserve its visual scale. Native browser text is sharper than text repeatedly resampled from a GPU-composited projective layer. At transition start, the body gate disables the native rule and the already-present matrix resumes at the same location and typography geometry.

This bridge is why the canvas and DOM must agree on:

- Section identifiers and order.
- Panel size proportions.
- Current viewport dimensions.
- Camera and frame locations.

`quadMatrix()`, projection matrix code, and `lookAt()` are high-risk mathematical utilities. Leave them unchanged for ordinary design work.

### Scene colors

WebGL color arrays use normalized values, not CSS colors:

```js
[0.84, 0.42, 1, 0.8]
```

The four numbers mean red, green, blue, and alpha, each from 0 to 1. A complete palette change requires editing both CSS theme/literal colors and these scene draw colors.

## 9. `content.js` and optional project case studies

`content.js` creates `window.PORTFOLIO_PROJECTS`. Every record currently contains:

```text
slug
title
year
role
summary
context
constraints[]
decisions[]
process
result
tech[]
```

This data generates the in-page dialog only. It does not generate the project flip cards or standalone pages. The current Flexcar, Prove, and Tailorbird cards use ordinary external links, while PintOS, League Predictor, Music Generation, and the 2019 placeholder have non-interactive pending-link spans; none of the seven reads these records.

For any project that uses the optional internal case-study system, its information is intentionally duplicated across:

1. `index.html` project flip card.
2. `content.js` dialog data.
3. `projects/<slug>/index.html` standalone case study and metadata.
4. `sitemap.xml` URL, when the slug or project list changes.

The repository has no template engine or build step to synchronize these copies. Treat synchronization as a manual publishing checklist whenever you add or reconnect an internal case study. Official-link cards need only their card content and destination maintained in `index.html`. Pending-link cards likewise remain local to `index.html` until a real destination or internal case study is intentionally added.

## 10. Common edit recipes

### Change the main identity

Update all relevant copies:

- Main `<title>`, description, Open Graph text, and canonical URL in `index.html`.
- `Person` JSON-LD in `index.html`.
- Entrance wordmark, role, and statement.
- Persistent mini-wordmark and identity copy.
- Hard-coded `Joy In` title strings in `script.js` if the name changes.
- `site.webmanifest`.
- Author/name metadata on every standalone project page.
- Social preview artwork if it contains the old identity.

Find current occurrences with:

```sh
rg -n "Joy In|JOY|IN" .
```

Review results rather than blindly replacing short words like `IN`, which can appear inside unrelated text.

### Change the email address

There are currently two `mailto:` links in `index.html`: the Work timeline's Suggestions panel and the utility bar.

Find them with:

```sh
rg -n "hello@example.com|mailto:" .
```

Change both the visible email behavior and any surrounding contact copy you want.

### Change the public domain

The checked-in production URL is `https://joying-yang.github.io/`. If the site moves to a custom domain, update it in:

- Main canonical and Open Graph metadata.
- Every standalone project page.
- `sitemap.xml`.
- `robots.txt`.

Use:

```sh
rg -n "joying-yang\.github\.io" index.html projects robots.txt sitemap.xml
```

### Edit a section or authored subpage

Change the text in the corresponding section of `index.html`.

- Preserve the outer section IDs and data attributes.
- Keep the single `.work-timeline-page.is-selected`; Work stops are disclosures inside it, not additional subpages.
- Keep each Education or Skills subpage short enough to fit the shared spatial viewport. Put additional logical groups in another authored subpage instead of restoring an internal scrollbar.
- Work detail panels overlay one shared artboard and project entries share the fixed viewport, so keep their summaries concise rather than making either surface overflow.
- Check the distant teaser and full panel.
- Check desktop 3D, 2D, and mobile after adding substantial text.

### Change an Education logo

Each school record in `index.html` has an `.education-logo-slot` beside an `.education-meta__details` grid. Berkeley uses `.education-meta--logo-left`; Peking uses `.education-meta--logo-right`. Those modifier classes only change the named CSS grid areas, which flips the logo and details without duplicating the layout rules.

Replace the image inside the corresponding slot and keep intrinsic dimensions in the markup:

```html
<div class="education-logo-slot" aria-hidden="true">
  <img src="assets/your-school-logo.png" width="500" height="398" alt="" />
</div>
```

The empty alternative text is intentional because the full institution name is adjacent to the decorative logo. The `.education-logo-slot img` rule keeps the entire image inside the square with `object-fit: contain`. The Education metadata cells and logo slot use transparent backgrounds, no violet border, and no one-pixel colored gap, so they visually share the section panel instead of forming darker rectangles around the text or artwork.

### Work timeline road, runner, and stop coordinates

Work uses one 2172×724 image, `assets/road_flagged.png`, inside `.work-timeline__artboard`. The artboard has the same `2172 / 724` aspect ratio, so its absolutely positioned controls and the three painted experience flagposts share one coordinate system at every rendered size. `.work-timeline__road` fills that artboard with `object-fit: contain`, uses `mix-blend-mode: screen` to merge its dark canvas into the cyberpunk panel, ignores pointer input, and is decorative (`alt=""` and `aria-hidden="true"`). The whole artboard is anchored to the bottom and translated downward by 25%.

The employment route reads left to right in chronological order: Tesla → Apple → Meta. Those three 44×44 anchors sit at `top: 7%`, with `--stop-x` matching each painted flag center. A fourth `.work-stop--suggestions` contact post sits near the road's far-right exit at `94.29%` and `top: 20%`; it is not a fourth job. Every circular plus trigger is centered with `left: calc(var(--stop-x) - 22px)`:

| Stop selector | Purpose/order | `--stop-x` | Top | Desktop panel left | Mobile panel left | Accent |
|---|---|---:|---:|---:|---:|---|
| `.work-stop--tesla` (inherits `.work-stop` defaults) | Experience 01 · Summer 2022 | `28.01%` | `7%` | `-14px` | `4px` | `var(--violet-mid)` |
| `.work-stop--apple` | Experience 02 · Summers 2023 + 2024 | `49.24%` | `7%` | `-118px` | `-75px` | `var(--violet-dim)` |
| `.work-stop--meta` | Experience 03 · Aug 2025—present | `72.63%` | `7%` | `-222px` | `-151px` | `var(--violet-strong)` |
| `.work-stop--suggestions` | Contact 04 · Suggestions/Email | `94.29%` | `20%` | `-258px` | `-218px` | `var(--amber-copy)` |

Do not change the first three percentages merely to change panel spacing: they register the experience buttons to flag pixels in `road_flagged.png`. The Suggestions percentage targets the measured far-right lamp post at `94.29%`. The 280px panel uses `bottom: 0` on the same `.work-stop` anchor, covering the plus beacon as it expands; `--stop-panel-left` shifts that larger rectangle horizontally so it stays within the portfolio frame. If the road artwork changes, remeasure the three flag centers and the contact lamp post.

The second decorative layer is `assets/kirbs-animated.gif`, a 512×512, 33-frame transparent runner. `.work-timeline__kirbs-track` is `aria-hidden`; its nested runner moves the already animated GIF horizontally using `work-kirbs-crossing`, from one sprite-width before `--kirbs-start` through `--kirbs-end: 100%`. `.work-timeline__kirbs` sits at `bottom: 31%`, shifts upward by 20% of its own rendered height with `translateY(-20%)`, uses a clamped `52px–76px` size, and retains crisp pixel edges. Desktop crossing is linear, infinite, and 18.48 seconds with a `-2.64s` initial offset. On mobile the visible route is shorter, so the crossing duration becomes 13.2 seconds.

Layer order is intentional: the road is `z-index: 0`, the Kirbs track is `z-index: 1`, and the stop list is `z-index: 2`; open stops rise higher through `.is-open`. Both the road and runner ignore pointer events, and the GIF also disables selection and dragging. Kirbs is completely hidden for the saved reduced-motion mode, the operating-system reduced-motion preference, forced-colors mode, and no-JavaScript mode. This avoids decorative motion when motion is reduced and prevents an unpositioned GIF from appearing before enhancement.

### Work-stop records and logos

`#work-timeline` contains one `.work-timeline-page`, then `.work-timeline__artboard`, the road, Kirbs track, and an ordered `.work-timeline__stops` list. Every `<li data-work-stop>` contains a plus-only `[data-work-stop-trigger]`, a `[data-work-stop-panel]`, and a real × `[data-work-stop-close]` button inside that panel. The trigger's `aria-controls` must match the panel ID; the panel's `aria-labelledby` must match its unique `<h3>` ID. Employer records use `data-work-company="…"`; a non-employer record can override the generated phrase with `data-work-label="…"`.

The three experience panels use `.work-stop__heading`, `.work-stop__role`, `.work-stop__time`, and `.work-stop__summary`. Company images render in a shared 38×38 `object-fit: contain` box; Apple's taller silhouette uses a 31×36 override. Their empty alternative text is intentional because the company heading immediately beside each logo supplies the same name. The fourth contact panel instead uses `.work-stop__heading--contact` and `.work-stop__email`; its “Email.” link is a real `mailto:` action and has no fake employer logo, role, or date.

With JavaScript, all panels initialize closed and only the selected record is exposed. The four closed preview controls remain 44×44 at every responsive size and contain only `+`; names and record indices live in the expanded panels. In 2D mode the same single interactive timeline remains intact—there are no hidden Work subpages to expand.

Below 768px, the instruction stacks and the artboard changes from full width to `width: 128%` with `left: -28%`. That crops away the first `21.875%` of source-space while retaining the far-right Suggestions post. The stop `--stop-x` values remain in the original artboard coordinate system; only the panel offsets switch to the mobile values in the table, and panel width is capped at `min(280px, 100vw - 42px)`. Kirbs likewise starts at `21.875%` so it enters at the visible crop boundary rather than traversing hidden space.

With reduced motion, details open and close immediately. In forced-colors mode the decorative road and Kirbs disappear while the triggers, close buttons, and panels use system colors. Without JavaScript, both the plus beacons and nonfunctional × buttons hide, Kirbs is removed, and all four panels enter an `auto-fit` grid whose columns are at least 220px when room permits; below 768px that grid becomes one column. This is why authored panels should not start with hard-coded `hidden`, `inert`, or `aria-hidden` attributes—`bindWorkStops()` applies those states only after JavaScript is available.

### Edit a Work timeline stop

1. Find its `<li data-work-stop>` inside `.work-timeline__stops` in `index.html`.
2. Keep the trigger plus-only. For an employer, edit `data-work-company` plus the panel's field-record index, heading, role, `<time datetime>` values, location, and `.work-stop__summary`. For the contact post, edit `data-work-label`, its “Open channel” heading, and `.work-stop__email` instead.
3. Replace the `.work-stop__heading img` source and keep `width` and `height` equal to the asset's intrinsic pixel dimensions. Keep `alt=""` while the adjacent heading repeats the company name.
4. If the stop identifier changes, update the modifier class, its `data-work-company` or `data-work-label`, trigger ID, panel ID, heading ID, trigger `aria-controls`, panel `aria-labelledby`, and close button `aria-label` together.
5. Change that modifier's `--stop-accent` for color, `--stop-panel-left` for panel clearance, or `--stop-x` only when its painted experience flag or intentional contact target moves.
6. Update `Route // 2022—Now` when the overall time span changes, then test click/touch, Tab, Escape, outside-click dismissal, and the one-open-at-a-time rule.

### Add a Work timeline stop

1. For another experience, add a painted flag to `assets/road_flagged.png` (or replace it with an equivalently proportioned asset) in the correct left-to-right chronological position. For another utility/contact post, choose intentional clear space instead of implying it is an employer flag.
2. Duplicate one complete `<li data-work-stop>` inside the ordered list. Keep employer records in chronological order and utility posts after the experience sequence; update the instruction and ordered-list `aria-label` if the new purpose is not already described.
3. Give the stop a unique modifier class and unique trigger, panel, and heading IDs; reconnect `aria-controls` and `aria-labelledby`. Use `data-work-company` for an employer or `data-work-label` for a custom accessible phrase.
4. Keep a single decorative `+` in the trigger. Fill the appropriate experience or contact panel pattern, add its labeled × close button, and renumber visible record/channel indices.
5. Add a CSS modifier with the measured or intentionally chosen `--stop-x`, a suitable desktop `--stop-panel-left`, and `--stop-accent`; add its mobile panel offset in the `max-width: 767px` block.
6. Keep the Work header count at `01 / 01`: adding a beacon does not add a Work page. Do not restore `data-role-index`, `data-road-step`, role arrows, or a route cursor.
7. Check that neighboring 44×44 triggers and open panels do not overlap, including the Suggestions post at the far-right crop; more stops may require a redesigned road or panel offsets rather than pagination.
8. Test desktop 3D, mobile crop alignment, 2D, reduced motion, forced colors, no JavaScript, Kirbs layering/timing, and all email/contact links.

### Edit an existing project

Edit the project's single `<article data-project-card>` in `index.html`:

1. Change the front eyebrow, year, title, and either the image inside `.project-card__mark--image` or the initials inside a CSS mark. Keep all seven cards in descending year order across the two page wrappers; ties follow DOM order.
2. Change the back technical heading and summary, then edit the real resume bullets inside `.project-card__bullets`. Keep every bullet inside its surrounding `<ul>`.
3. Rebuild the front `.project-card__tech` chips from the technologies and technical practices supported by those bullets. Do not leave copied skills from the card that originally supplied the markup.
4. For Flexcar, Prove, or Tailorbird, change the `.project-card__external` link's `href` and visible label as needed, retaining `target="_blank"` with `rel="noopener noreferrer"`. For a project without a destination, keep a non-interactive `.project-card__external--placeholder` span and update its accessible label; do not use an empty or `#` link.
5. If the project name or identifier changes, update `data-project`, `data-project-title`, both unique face IDs, the button's `aria-controls`, its `aria-label`, and the skill/bullet `aria-label` values together. Also keep the page's `data-page-label` and grid `aria-label` accurate.
6. Preserve the page's intended footprint: page `0` has one feature card followed by two shorter cards, while page `1` uses `.project-card-grid--four` for four equal cells. Do not reduce one card's font sizes to force its content to fit; change its footprint or page grouping instead.
7. Rename or add the project modifier class and its accent variables in `styles.css` if the card needs a different color or placeholder-mark shape.

Project images use `alt=""` because a semantic `<h3>` supplies the name. Flexcar and Prove keep that heading as `.sr-only` to avoid visually repeating the name already drawn in their wordmarks; do not delete those headings or their `tabindex="-1"`, because section focus logic targets the first project heading. Other cards keep the heading visible beside their artwork. Use `.project-card__mark--image` to suppress generated geometry, preserve intrinsic `width` and `height` attributes, and add card-specific cropping only when the source asset requires it.

Only follow the older multi-file publishing checklist in the next subsection when a card is deliberately wired to an internal case study with `data-open-project`. None of the current seven cards needs a matching `content.js` record or standalone route: three use official external destinations and four show pending-link spans.

### Add a project

1. Copy one complete `<article class="project-card project-card--flip ..." data-project-card>` in `index.html`; a face without its surrounding surface and persistent toggle will not work correctly. Give it either `.project-card--feature` or `.project-card--compact` according to its place in the mosaic.
2. Give the card a unique `data-project` identifier and a human-readable `data-project-title`.
3. Give its front and back faces unique IDs. Point the toggle's `aria-controls` at the back-face ID and write a project-specific `aria-label`.
4. Fill the back first with its summary and resume-bullet `<li>` elements. Then derive the front skill chips from that evidence and add the title and logo mark.
5. Use an ordinary `.project-card__external` anchor when a real destination exists. Otherwise use the non-interactive `.project-card__external--placeholder` span pattern and a project-specific accessible label.
6. Insert the card in descending year order and choose the layout from its content: the three-card mosaic uses one wide feature plus two lower cards; adding `.project-card-grid--four` produces four equal 2×2 cells. All cards inherit the same typography. If neither footprint fits, create another `.section-page.project-page` with the next zero-based `data-project-page-index`, a useful chronological `data-page-label`, and its own grid. Add `hidden` and omit `.is-selected` on every non-initial page. Renumber visible record indices and technical-file codes after reordering.
7. Add a project modifier in `styles.css` when a distinct accent or mark shape is needed. The shared `.project-card--flip`, `.project-card--feature`, and `.project-card--compact` rules should continue to control sizing and interaction.
8. Run validation and test wide 3D, narrow/portrait 3D, 2D, hover, toggle click/touch, Tab, Escape, reduced motion, and either the official URL or the pending-link presentation. Also test that the page arrows disable at the first and last page.

If the new project should instead open an internal case study, also add `data-open-project`, create a matching complete record in `content.js`, create `projects/<slug>/index.html`, preserve its `../../` asset paths, and add its public URL to `sitemap.xml`. Keep `data-project`, `data-open-project`, the object key, record `slug`, link path, and folder name identical.

If an object key contains a hyphen, quote it or JavaScript will fail to parse:

```js
'my-project': {
  slug: 'my-project',
  // remaining fields
}
```

### Add or edit a skill item

Skill entries are uniform cards inside `.skill-page .skill-list` in `index.html`. Copy one complete list item into the most relevant capability layer, then change its node key, accent modifier, description, technology name, category, and local image path:

```html
<li class="skill-item" data-skill-node="typescript">
  <div class="skill-item__control" data-skill-control>
    <span class="skill-item__mark" aria-hidden="true">
      <img src="assets/Typescript_logo_2020.svg.webp" alt="" width="3840" height="3840" />
    </span>
    <span class="skill-item__copy">
      <strong>TypeScript</strong>
      <small>Typed language</small>
      <span class="skill-item__detail">Typed client architecture for maintainable product systems.</span>
    </span>
  </div>
</li>
```

`data-skill-node` must be unique and URL-safe. The `.skill-item__detail` text supplies both the inline 2D description and the spatial inspector sentence. Keep the source control as a plain `<div>`: `updateSkillPages()` adds button semantics only while spatial interaction is available. The default accent is cyan; add `skill-item--amber` or `skill-item--violet` for restrained visual rhythm, not to imply proficiency.

Keep each layer near eight items so the fixed spatial panel retains its four-by-two landscape and two-by-four narrow/portrait matrix. When adding a technology, rebalance layers or add another sequential `.skill-page`, a matching `[data-skill-page-select]` button, and accurate page counts. `updateSkillPages()` discovers page wrappers, while the direct selector's `data-skill-page-select` value chooses its zero-based index.

Put new logo files under `assets/` and prefer transparent PNG, WebP, or valid SVG artwork. Keep the empty image alternative because the adjacent text supplies the technology name. `.skill-item__mark img` constrains the logo without stretching it. The uploaded `html_logo.svg` and `git_logo.svg` files contain WebP data despite their extensions, so the page references the byte-identical `html_logo.webp` and `git_logo.webp` copies for reliable HTTP content types. Dark or baked-background artwork is corrected only with node-specific CSS filters; avoid applying a blanket filter to every brand logo.

### Change colors

1. Change root variables at the top of `styles.css`.
2. Search for hard-coded violet/text literals if you need a complete recolor.
3. Change normalized RGBA arrays in `scene.js` for the WebGL environment.
4. Check focus visibility and text contrast, not only aesthetics.
5. Check forced-colors mode is still usable.

### Change motion speed

There are two separate motion systems:

- CSS timings in `:root` for fades, interface transitions, and the fallback veil.
- Camera durations in `scene.js` for spatial travel.

Changing only `--motion-camera` does not change WebGL camera speed. Changing scene duration does not automatically change gate CSS or the 1200 ms entry fallback.

After any motion edit, test:

- Entrance to Education.
- Every adjacent forward trip.
- Every adjacent reverse trip.
- A non-adjacent nav-link trip.
- Reduced motion.
- Switching to 2D during or after travel.

### Rename a visible section

Changing only display wording is manageable:

- Change the nav text, `.panel-teaser strong`, `.section-kicker`, and visible headings in `index.html`.
- Update the gate abbreviation/index if the new label makes the old abbreviation misleading.
- Change the matching value in `LABELS` in `script.js`.
- Keep the internal ID such as `education` unchanged.

Renaming the internal ID or adding a fifth top-level section is advanced. It affects:

- `SECTIONS` and `LABELS` in `script.js`.
- Nav links, hashes, section IDs, and `data-section` in `index.html`.
- `STOPS` and `ORDER` in `scene.js`.
- Initial body state.
- Orientation dots and hard-coded `/ 04` counts.
- Four-column mobile/no-JavaScript navigation CSS.
- Gate index text and scene geometry.

The decorative rail builder currently uses hard-coded route bounds ending at index `3`/`3.001`. A fifth stop requires changing those bounds to the new last index, ideally derived from `ORDER.length - 1`. New section IDs also fall into the generic final branch of `makePanelMotif()` unless you add an explicit motif case.

## 11. URLs and browser history

Main sections use URL hashes:

```text
/#education
/#work
/#projects
/#skills
```

2D mode adds:

```text
?mode=2d#projects
```

Project routes use real directories:

```text
/projects/threshold/
```

When a project opens as a dialog, JavaScript pushes that clean route into history without leaving the main document. This allows Back/Forward to open and close the dialog naturally. A direct request to the same route loads the standalone HTML page.

Opening files directly with `file://` can be useful for a quick visual check, but clean directory routes and History API behavior are more reliable through the supplied HTTP server.

## 12. Accessibility and progressive enhancement

The site has several complete presentation paths:

```text
Desktop spatial mode  → WebGL environment + projected semantic HTML
Mobile spatial mode   → simplified active semantic panel + lighter scene
Explicit 2D mode      → all content in normal document flow
WebGL failure         → automatic 2D fallback
Reduced motion        → immediate camera completion and near-zero CSS motion
Forced colors         → decorative scene removed, system colors retained
No JavaScript         → all semantic content exposed as a linear document
```

Important accessibility mechanisms include:

- Skip link.
- Semantic headings and section labels.
- Decorative layers marked `aria-hidden`.
- Inactive spatial panels made `inert` and `aria-hidden`.
- Programmatic focus after navigation.
- Live-region announcements for sections, authored pages, projects, modes, and motion.
- Work plus beacons with labels derived from `data-work-label` or the `data-work-company` fallback, `aria-expanded`/`aria-controls`, real labeled × buttons, labeled detail regions, Escape focus restoration, and hidden/inert synchronization.
- Native links underneath project dialog enhancement.
- Native `<dialog>` behavior and focus restoration.
- Reduced-motion and forced-colors support.
- Wheel handling that allows internal panel scrolling.
- Keyboard handling that does not hijack editable fields.

Changing `hidden`, `inert`, focus calls, `aria-*`, or heading structure can affect users even when the visual page still looks correct.

## 13. Local server, validation, and deployment

### Development server

`tools/serve.sh` launches the cross-platform Python server in `tools/serve.py`. It:

- Binds only to `127.0.0.1`.
- Maps `/` and directories to `index.html`.
- Removes query strings before resolving files.
- Prevents paths from escaping the project root.
- Sends a real 404 status with `404.html`.
- Supplies MIME types for the repository’s assets.
- Supports `HEAD` requests.
- Sends `Cache-Control: no-cache`.

It is not intended to be exposed as a public production server. `tools/serve.ps1` remains available for Windows users and provides the same core routing behavior.

### Validator coverage

`tools/validate.py` checks:

- HTML doctypes.
- Duplicate IDs within each page.
- Local `href` and `src` targets.
- Local hash fragments.
- JSON parsing for the manifest and, in the source tree, the optional Vercel config.
- XML parsing for the sitemap and SVG assets.
- A real standalone route for every `slug:` in `content.js`.
- That `scene.js` remains lazy-loaded.
- That the placeholder production domain has not returned.

It does **not** check:

- JavaScript or CSS syntax comprehensively.
- Browser rendering and motion.
- Accessibility behavior.
- External URLs.
- Metadata accuracy.
- Whether duplicated project content matches.

The validator is intentionally simple and regex-based. Its HTML checks expect double-quoted `id`, `href`, and `src` attributes, and its project discovery expects a single-quoted pattern such as `slug: 'threshold'`. Keeping those quote conventions ensures the checks see your edits; changing them can make a check silently miss something. `tools/validate.ps1` remains available for Windows compatibility.

### GitHub Pages deployment

The repository name, `joying-yang.github.io`, makes this a root-level GitHub user site. Its production URL is:

```text
https://joying-yang.github.io/
```

The workflow in `.github/workflows/deploy-pages.yml` runs on every push to `main` and can also be started manually. It performs four steps:

1. Runs the Python validator against the source tree.
2. Copies only the public HTML, CSS, JavaScript, manifest, crawler files, project routes, and assets into `_site`.
3. Validates that staged artifact a second time.
4. Uploads and deploys the artifact to the `github-pages` environment.

The explicit allowlist keeps development tools, repository metadata, temporary browser profiles, and Vercel configuration out of the public website artifact. The staged `.nojekyll` file also tells Pages to serve the files as an ordinary static site.

Before the first deployment, open **Settings → Pages** in GitHub and choose **GitHub Actions** as the publishing source. Push to `main`, then review the **Deploy portfolio to GitHub Pages** workflow in the Actions tab. GitHub Pages serves user sites from a case-sensitive Linux environment, so preserve the exact capitalization of every referenced filename.

GitHub Pages supports the site's directory-index project routes and custom `404.html`, but it does not apply the response headers in `vercel.json`. Enforce HTTPS in the Pages settings. If equivalent Content Security Policy or other custom response headers are required, use a host that supports them or put a configurable CDN in front of Pages.

### Vercel deployment

Vercel remains an optional alternative. Use the repository directory as the project root and no build command.

`vercel.json` enables clean URLs, trailing slashes, and security headers. Its Content Security Policy currently allows same-origin scripts, styles, fonts, connections, and images plus `data:` images. Adding an external font, analytics service, API, embed, form provider, or CDN usually requires an explicit CSP change.

Those `vercel.json` headers apply on Vercel. Another static host may ignore that file, so recreate equivalent routing and security settings in that host’s configuration.

`frame-ancestors 'none'` prevents other sites from embedding the portfolio in an iframe.

### Manifest and assets

The web manifest provides install-style naming and colors, but there is no service worker or offline cache. This is not an offline PWA.

`og-card.svg` is editable source art. Social metadata references `og-card.png`; changing the SVG does not regenerate the PNG. Replace or regenerate the PNG after changing the social artwork.

The 404 page uses root-relative paths such as `/styles.css`. That is correct for this root-level GitHub user site, but requires adjustment if the repository is renamed and hosted as a project site under a subdirectory.

`robots.txt` currently allows crawling. Do not publish a private staging site unchanged if search indexing is unwanted.

## 14. Debugging guide

### A saved change does not appear

1. Confirm the file was saved.
2. Use `Command+Shift+R` on macOS (`Ctrl+F5` on Windows).
3. Confirm the server is still running.
4. Confirm you opened `127.0.0.1` with the correct port.
5. Search later CSS rules that may override your change.

### Clicking controls suddenly does nothing

Open Chrome DevTools with `F12`, then inspect the Console. A missing quote, bracket, parenthesis, or comma can stop an entire JavaScript file.

Common object syntax:

```js
project: {
  title: 'Example',
  tech: ['HTML', 'CSS'],
}
```

Strings containing apostrophes need a different quote style or escaping:

```js
summary: "Joy's project"
// or
summary: 'Joy\'s project'
```

Save text files as UTF-8 so arrows, em dashes, middle dots, and curly quotes remain correct.

### Spatial mode is wrong but 2D is correct

Check:

- `scene.js` stop values and section order.
- Projected panel CSS dimensions.
- Whether a panel’s ID still matches its scene stop.
- The body’s `.has-scene-projection` class.
- On the settled active panel, `.is-native-focused`, a computed `transform` of `none`, and a computed `will-change` of `auto`.
- During travel, a computed matrix transform and no active native-focus override.
- Inline `transform`, opacity, and custom properties on the panel.

Use DevTools → Elements and inspect the `<body>` data attributes and classes while moving.

### The project dialog and direct page disagree

Update both `content.js` and `projects/<slug>/index.html`, plus the preview in `index.html` when relevant. There is no automatic synchronization.

### A project route returns 404

Confirm:

- The server was started from this repository.
- The directory is exactly `projects/<slug>/`.
- That directory contains `index.html`.
- `content.js` uses the same slug.
- The link uses the same path.

Then run the validator.

### The site opens in an unexpected mode or skips motion

Mode may be stored in `localStorage` or requested by `?mode=2d`. Motion may be stored separately or inherited from the operating-system reduced-motion preference. The operating-system motion setting does not itself switch the site to 2D; it makes spatial transitions complete immediately. Reset saved values with the Console commands in the Preferences section.

### WebGL falls back to 2D

That can be expected on unsupported, restricted, or context-lost environments. Check the Console for WebGL/shader errors, but confirm the 2D content remains usable before treating it as a total-site failure.

## 15. Recommended manual-edit workflow

1. Start the local server.
2. Make one small change.
3. Save and hard-refresh.
4. Check the entrance.
5. Check the edited section in desktop 3D.
6. Navigate forward and backward around it.
7. Toggle 2D and inspect the same content.
8. Resize Chrome to roughly 390px wide and inspect mobile.
9. Use Tab, Enter, Escape, and arrow keys.
10. Test project dialogs and their direct pages when relevant.
11. Toggle reduced motion after motion/layout edits.
12. Run `./tools/validate.sh` on macOS or `tools/validate.ps1` on Windows.

For larger edits, keep a short checklist of every duplicated location you changed.

## 16. Invariants worth protecting

These relationships are more important than any single line of code:

- Section IDs, nav values, `SECTIONS`, `STOPS`, and `ORDER` agree.
- `active`, `settled`, and `displayed` remain separate.
- Reverse travel evaluates the same canonical path backward.
- Position and viewing direction share one progress curve.
- Settled cameras remain directly normal to their panels.
- Settled front-facing active panels use native focus bounds, while entrance, travel, and distant panels retain their projection matrices.
- Projection source sizes stay canonical across native focus and viewport resizes; all `STOPS` receive the same shared panel size.
- `scene.js` remains lazy-loaded.
- The real semantic HTML remains the canonical content source.
- Inactive projected panels remain visible scenery but non-interactive and hidden from accessibility APIs.
- Work road artwork and stop controls retain one shared coordinate system; DOM order keeps Tesla → Apple → Meta employment chronology before the Suggestions/Email contact post.
- Every Work stop has a meaningful `data-work-label` or `data-work-company` fallback, trigger label, close label, and panel heading; each trigger `aria-controls` matches its panel ID, each panel `aria-labelledby` matches its heading ID, and at most one JavaScript-enhanced record is open.
- The decorative Work stack remains road at z0, Kirbs at z1, and interactive stops at z2; Kirbs stays absent for reduced motion, forced colors, and no JavaScript.
- Every flip card keeps unique face IDs, a matching toggle `aria-controls`, and only one accessibility-visible face while JavaScript is active.
- For optional internal case studies, the project object key, slug, data attributes, link, folder, and sitemap agree, and dialog and standalone content remain synchronized manually.
- 2D, reduced-motion, forced-colors, WebGL-failure, and no-JavaScript paths keep the content available.

## 17. Source landmarks

When you are ready to read the code, start with these named areas rather than reading every line in order:

| File | Start with |
|---|---|
| [`index.html`](index.html) | `#entry-gate`, `.section-nav`, `#portfolio-main`, each `[data-section]`, `#work-timeline`, `[data-work-stop]`, `.project-page`, `[data-project-card]`, `.skill-page-selector`, `[data-skill-control]`, `#project-dialog` |
| [`styles.css`](styles.css) | `:root`, `.entry-gate`, `.content-panel`, `.work-timeline__artboard`, `.work-timeline__kirbs-track`, `.work-stop`, `.project-card-grid--mosaic`, `.project-card-grid--four`, `.project-card--feature`, `.project-card--compact`, `.project-card--flip`, `.project-card__face`, `.skill-overview`, `.skill-list`, `.skill-item__control`, `.has-scene-projection`, `body[data-mode="2d"]`, responsive and container queries |
| [`script.js`](script.js) | `state`, `boot()`, `bindEvents()`, `bindWorkStops()`, `setWorkStop()`, `closeWorkStops()`, `bindProjectCards()`, `requestProjectCardFace()`, `setProjectCardFace()`, `bindSkillControls()`, `updateSkillInspector()`, `enterGallery()`, `goToSection()`, `applySceneProjection()`, `updateEducationPages()`, `updateProjectPages()`, `updateSkillPages()`, `setMode()`, `openProject()` |
| [`scene.js`](scene.js) | panel sizing constants, `STOPS`, `createScene()`, `syncPanelGeometry()`, `render()`, `draw()`, `emitProjection()`, `transitionTo()`, `softLinear()` |
| [`content.js`](content.js) | `window.PORTFOLIO_PROJECTS` and one complete project record |
| [`tools/serve.py`](tools/serve.py) | request handler, custom 404 response, local server startup |
| [`tools/validate.py`](tools/validate.py) | HTML loop, reference checks, project-slug checks |
| [`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml) | validation, public-file staging, Pages artifact, deployment job |

## 18. Glossary

- **DOM**: The browser’s in-memory tree of HTML elements.
- **Semantic HTML**: Tags chosen for meaning, such as `nav`, `main`, `section`, and headings.
- **CSS selector**: A pattern that chooses which HTML elements receive a style.
- **Cascade**: The rules CSS uses to decide which declaration wins.
- **Attribute**: Extra information inside an HTML opening tag.
- **Data attribute**: A custom HTML attribute beginning with `data-`.
- **Event listener**: A function waiting for a click, key, scroll, or other browser event.
- **State**: The current facts the interface needs to remember.
- **Callback**: A function passed elsewhere to run later, often after completion.
- **Progressive enhancement**: Starting with usable HTML and adding richer behavior when supported.
- **WebGL**: A browser API for drawing GPU-accelerated graphics on a canvas.
- **Shader**: A small GPU program that transforms vertices or colors pixels.
- **Vertex**: One point in 3D geometry.
- **Buffer**: Data uploaded to the GPU, such as a list of vertex coordinates.
- **Camera**: The position and direction from which the 3D world is viewed.
- **Projection matrix**: Math that converts a 3D view into perspective screen coordinates.
- **`matrix3d`**: A CSS transform capable of perspective mapping.
- **Interpolation**: Calculating a value between a start and an end.
- **Easing**: Changing how quickly interpolation progresses over time.
- **DPR**: Device pixel ratio; higher values render more canvas pixels and cost more GPU work.
- **URL hash**: The `#projects` portion of a URL.
- **History API**: Browser functions that update URLs and Back/Forward behavior without a full page load.
- **`localStorage`**: Small browser storage used here for mode and motion preferences.
- **CSP**: Content Security Policy, which restricts where production resources may load from.
- **JSON-LD**: Structured metadata embedded for search engines.
- **Slug**: A URL-safe identifier such as `signal-archive`.

The safest learning path is: edit HTML copy, learn the CSS selectors around that copy, inspect how `script.js` finds it through an ID or `data-*` attribute, and only then trace how the same section is positioned by `scene.js`.
