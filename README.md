# Liminal portfolio

A dependency-free, progressively enhanced portfolio based on the supplied implementation specification.

For a beginner-friendly explanation of the complete repository, safe editing recipes, JavaScript state, CSS architecture, WebGL projection, testing, and deployment, read [DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md).

## Preview

Serve this folder from any static HTTP server and open `index.html`. Clean project routes require directory-index support, which is enabled by default on common static hosts.

The site also opens directly from the filesystem for visual review. In-app project history routing is most reliable over HTTP.

Run `powershell -ExecutionPolicy Bypass -File tools/validate.ps1` for the dependency-free structural/link validation suite.

## Content handoff

The current identity and portfolio records are polished seed content because the specification did not include owner data. Before launch, replace:

- the identity, education, work, and skills copy in `index.html`;
- project records in `content.js` and their matching standalone pages under `projects/`;
- the reserved `hello@example.com` / `portfolio.example` values and sitemap URLs with confirmed public details;
- geometric project artwork with optimized owned media if desired;
- metadata and structured data with verified public information.

Missing résumé, GitHub, and LinkedIn links are intentionally omitted instead of rendered as disabled or fake actions.

## Implementation notes

- All meaningful content is semantic HTML and remains usable without WebGL or JavaScript.
- `scene.js` is a small raw-WebGL progressive layer with authored camera stops, shared line geometry, capped DPR, demand rendering, and context-loss fallback.
- `script.js` coordinates the gate, URL fragments/history, focus, live announcements, keyboard/wheel/swipe input, explicit 2D mode, reduced motion, nested records, and route-backed project dialogs.
- Project directories are real standalone routes for direct loads and crawling.
- The environment used to create this site had no Node.js or package manager, so the prescribed Next.js/R3F/TypeScript toolchain and its automated test suite could not be bootstrapped here.
