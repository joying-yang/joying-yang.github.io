#!/usr/bin/env python3
"""Dependency-free structural validation for the static portfolio."""

import argparse
import html as html_module
import json
import re
import sys
import xml.etree.ElementTree as element_tree
from pathlib import Path
from urllib.parse import unquote


REPOSITORY_ROOT = Path(__file__).resolve().parent.parent
IGNORED_DIRECTORIES = {".git", ".tmp", "_site", "__pycache__"}
EXTERNAL_REFERENCE = re.compile(r"^(?:[a-z][a-z0-9+.-]*:|//)", re.IGNORECASE)


def parse_arguments():
    parser = argparse.ArgumentParser(description="Validate portfolio routes and static assets.")
    parser.add_argument(
        "--root",
        type=Path,
        default=REPOSITORY_ROOT,
        help="site root to validate (default: repository root)",
    )
    return parser.parse_args()


def is_ignored(path, root):
    try:
        relative_parts = path.relative_to(root).parts
    except ValueError:
        return False
    return any(part in IGNORED_DIRECTORIES for part in relative_parts)


def is_inside(path, root):
    try:
        path.relative_to(root)
        return True
    except ValueError:
        return False


def resolve_reference(reference, source_file, root):
    decoded = html_module.unescape(reference)
    path_and_query, separator, fragment = decoded.partition("#")
    path_part = unquote(path_and_query.split("?", 1)[0])
    fragment = unquote(fragment) if separator else ""

    if not path_part:
        target = source_file
    elif path_part.startswith("/"):
        target = root / path_part.lstrip("/")
    else:
        target = source_file.parent / path_part

    target = target.resolve()
    if not is_inside(target, root):
        return target, fragment, "escapes the site root"
    if target.is_dir():
        target = target / "index.html"
    return target, fragment, None


def validate_html(root, errors):
    html_files = sorted(
        path for path in root.rglob("*.html") if not is_ignored(path, root)
    )
    if not html_files:
        errors.append("No HTML routes found in {}".format(root))
        return []

    for source_file in html_files:
        markup = source_file.read_text(encoding="utf-8")
        if not re.search(r"<!doctype html>", markup, re.IGNORECASE):
            errors.append("Missing doctype: {}".format(source_file))

        identifiers = re.findall(r'\bid="([^"]+)"', markup)
        seen = set()
        duplicates = set()
        for identifier in identifiers:
            if identifier in seen:
                duplicates.add(identifier)
            seen.add(identifier)
        for identifier in sorted(duplicates):
            errors.append("Duplicate id '{}' in {}".format(identifier, source_file))

        references = re.findall(r'\b(?:href|src)="([^"]+)"', markup)
        for reference in references:
            if not reference.strip() or EXTERNAL_REFERENCE.match(reference):
                continue

            target, fragment, resolution_error = resolve_reference(
                reference, source_file, root
            )
            if resolution_error:
                errors.append(
                    "Local reference '{}' in {} {}".format(
                        reference, source_file, resolution_error
                    )
                )
                continue
            if not target.is_file():
                errors.append(
                    "Broken local reference '{}' in {}".format(reference, source_file)
                )
                continue
            if fragment and target.suffix.lower() == ".html":
                target_markup = target.read_text(encoding="utf-8")
                fragment_pattern = r'\bid="{}"'.format(re.escape(fragment))
                if not re.search(fragment_pattern, target_markup):
                    errors.append("Missing fragment '#{}' in {}".format(fragment, target))

    return html_files


def validate_json(root, errors):
    for relative_path in ("site.webmanifest", "vercel.json"):
        path = root / relative_path
        if not path.exists() and relative_path == "vercel.json":
            continue
        try:
            with path.open(encoding="utf-8") as handle:
                json.load(handle)
        except (OSError, ValueError) as error:
            errors.append("Invalid JSON in {}: {}".format(relative_path, error))


def validate_xml(root, errors):
    for relative_path in (
        "sitemap.xml",
        "assets/favicon.svg",
        "assets/og-card.svg",
    ):
        path = root / relative_path
        try:
            element_tree.parse(str(path))
        except (OSError, element_tree.ParseError) as error:
            errors.append("Invalid XML in {}: {}".format(relative_path, error))


def validate_project_routes(root, errors):
    content_path = root / "content.js"
    try:
        content = content_path.read_text(encoding="utf-8")
    except OSError as error:
        errors.append("Cannot read content.js: {}".format(error))
        return

    slugs = re.findall(r"slug: '([^']+)'", content)
    for slug in slugs:
        route = root / "projects" / slug / "index.html"
        if not route.is_file():
            errors.append("Missing standalone route for project '{}'".format(slug))


def validate_architecture(root, errors):
    index_path = root / "index.html"
    try:
        index_markup = index_path.read_text(encoding="utf-8")
    except OSError as error:
        errors.append("Cannot read index.html: {}".format(error))
        return

    if re.search(r'<script[^>]+src="scene\.js"', index_markup):
        errors.append(
            "scene.js must remain lazy-loaded so WebGL cannot block the semantic shell."
        )

    production_paths = [index_path, root / "robots.txt", root / "sitemap.xml"]
    production_paths.extend(sorted((root / "projects").glob("*/index.html")))
    for path in production_paths:
        try:
            contents = path.read_text(encoding="utf-8")
        except OSError:
            continue
        if "portfolio.example" in contents:
            errors.append("Placeholder production domain remains in {}".format(path))


def main():
    root = parse_arguments().root.expanduser().resolve()
    if not root.is_dir():
        raise SystemExit("ERROR: site root does not exist: {}".format(root))

    errors = []
    html_files = validate_html(root, errors)
    validate_json(root, errors)
    validate_xml(root, errors)
    validate_project_routes(root, errors)
    validate_architecture(root, errors)

    if errors:
        for error in errors:
            print("ERROR: {}".format(error), file=sys.stderr)
        print("FAIL: {} validation error(s).".format(len(errors)), file=sys.stderr)
        return 1

    print(
        "PASS: {} HTML routes; local references, fragments, IDs, project routes, JSON, and XML are valid.".format(
            len(html_files)
        )
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
