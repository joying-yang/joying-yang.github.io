#!/usr/bin/env python3
"""Serve the portfolio locally with clean directory routes and its custom 404 page."""

import argparse
import functools
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


REPOSITORY_ROOT = Path(__file__).resolve().parent.parent


class PortfolioRequestHandler(SimpleHTTPRequestHandler):
    """Static request handler that mirrors the behavior expected from Pages."""

    extensions_map = SimpleHTTPRequestHandler.extensions_map.copy()
    extensions_map.update(
        {
            ".avif": "image/avif",
            ".js": "text/javascript",
            ".json": "application/json",
            ".svg": "image/svg+xml",
            ".webmanifest": "application/manifest+json",
            ".webp": "image/webp",
            ".xml": "application/xml",
        }
    )

    def end_headers(self):
        self.send_header("Cache-Control", "no-cache")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "strict-origin-when-cross-origin")
        super().end_headers()

    def send_error(self, code, message=None, explain=None):
        if code != 404 or self.command not in ("GET", "HEAD"):
            return super().send_error(code, message, explain)

        error_page = Path(self.directory) / "404.html"
        if not error_page.is_file():
            return super().send_error(code, message, explain)

        payload = error_page.read_bytes()
        self.send_response(404, "Not Found")
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(payload)


def parse_arguments():
    parser = argparse.ArgumentParser(description="Serve the portfolio over local HTTP.")
    parser.add_argument("--port", type=int, default=4173, help="port to use (default: 4173)")
    parser.add_argument("--bind", default="127.0.0.1", help="address to bind (default: 127.0.0.1)")
    parser.add_argument(
        "--root",
        type=Path,
        default=REPOSITORY_ROOT,
        help="directory to serve (default: repository root)",
    )
    arguments = parser.parse_args()
    if not 1 <= arguments.port <= 65535:
        parser.error("--port must be between 1 and 65535")
    return arguments


def main():
    arguments = parse_arguments()
    root = arguments.root.expanduser().resolve()
    if not root.is_dir():
        raise SystemExit("ERROR: site root does not exist: {}".format(root))

    handler = functools.partial(PortfolioRequestHandler, directory=str(root))
    try:
        server = ThreadingHTTPServer((arguments.bind, arguments.port), handler)
    except OSError as error:
        raise SystemExit("ERROR: could not start local server: {}".format(error))

    print("Serving {} at http://{}:{}/".format(root, arguments.bind, arguments.port))
    print("Press Ctrl+C to stop.")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped.")
    finally:
        server.server_close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
