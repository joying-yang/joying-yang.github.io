# Joying portfolio

A dependency-free portfolio with two presentations of the same content:

- Spatial mode projects the four sections into a small WebGL gallery.
- 2D mode stacks those same section layouts into one scrollable page.

Both modes share the HTML in `index.html`; there is no framework, build step, or duplicated 2D page.

For a beginner-friendly explanation of the repository and safe editing recipes, read [DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md).

## Run locally on Windows

From this repository in PowerShell:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\tools\serve.ps1
```

Open <http://127.0.0.1:4173/>. Keep the PowerShell window open while viewing the site, and press `Ctrl+C` there to stop the server.

To use another port:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\tools\serve.ps1 -Port 4174
```

## Run locally on macOS or Linux

Python 3 is the only requirement:

```sh
./tools/serve.sh
```

Open <http://127.0.0.1:4173/> and press `Ctrl+C` to stop the server.

## Validate before publishing

On Windows:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\tools\validate.ps1
```

On macOS or Linux:

```sh
./tools/validate.sh
```

Validation checks HTML routes, local links and assets, IDs, ARIA references, JSON, XML, and the lazy-loaded WebGL architecture.

## Repository map

- `index.html` — all primary portfolio content and semantic structure
- `styles.css` — shared presentation, responsive layouts, 2D stacking, and spatial panel styling
- `script.js` — navigation, modes, history, accessibility, work beacons, and Skills tabs
- `scene.js` — the dependency-free WebGL scene and camera route
- `assets/` — images, logos, résumé, and social artwork
- `projects/` — retained standalone case-study URLs
- `tools/` — local servers and validation scripts
- `.github/workflows/deploy-pages.yml` — GitHub Pages validation and deployment

## Deployment

The GitHub Actions workflow validates the repository, stages only public files, validates the staged copy, and deploys it to GitHub Pages. In the repository settings, set Pages → Source to **GitHub Actions**, then push to `main` or run the workflow manually.
