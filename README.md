# Liminal portfolio

A dependency-free, progressively enhanced portfolio based on the supplied implementation specification.

For a beginner-friendly explanation of the complete repository, safe editing recipes, JavaScript state, CSS architecture, WebGL projection, testing, and deployment, read [DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md).

## Run locally on macOS

The site has no package installation or build step. It only needs Python 3 for the local development tools:

```sh
./tools/serve.sh
```

Open <http://127.0.0.1:4173/> and stop the server with `Ctrl+C`. To use another port, run `./tools/serve.sh --port 4174`.

Run the dependency-free structural and link checks before publishing:

```sh
./tools/validate.sh
```

The original PowerShell tools remain available for Windows users. The site can also be opened directly from the filesystem for a quick visual review, but clean project routes and History API behavior are most reliable over HTTP.

## GitHub Pages

This repository is a GitHub user site and is configured to publish at <https://joying-yang.github.io/>. The workflow in `.github/workflows/deploy-pages.yml` validates the site, copies only public site files into a deployment artifact, and deploys it whenever `main` changes.

Before the first deployment, open the repository's **Settings → Pages** and set **Source** to **GitHub Actions**. You can then push to `main` or start the workflow manually from the Actions tab.

## Content handoff

The current identity and portfolio records are polished seed content because the specification did not include owner data. Before launch, replace:

- the identity, education, work, and skills copy in `index.html`;
- project records in `content.js` and their matching standalone pages under `projects/`;
- the reserved `hello@example.com` values with a confirmed public address;
- geometric project artwork with optimized owned media if desired;
- metadata and structured data with verified public information.

Missing résumé, GitHub, and LinkedIn links are intentionally omitted instead of rendered as disabled or fake actions.

## Implementation notes

- All meaningful content is semantic HTML and remains usable without WebGL or JavaScript.
- `scene.js` is a small raw-WebGL progressive layer with authored camera stops, shared line geometry, capped DPR, demand rendering, and context-loss fallback.
- `script.js` coordinates the gate, URL fragments/history, focus, live announcements, keyboard/wheel/swipe input, explicit 2D mode, reduced motion, nested records, and route-backed project dialogs.
- Project directories are real standalone routes for direct loads and crawling.
- Local development, validation, and deployment use only browser-native code and the Python standard library; Node.js and a package manager are not required.
