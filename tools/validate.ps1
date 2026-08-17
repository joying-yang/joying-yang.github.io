$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$errors = @()
$htmlFiles = Get-ChildItem -LiteralPath $root -Recurse -Filter *.html

foreach ($file in $htmlFiles) {
  $html = Get-Content -LiteralPath $file.FullName -Raw
  if ($html -notmatch '(?i)<!doctype html>') {
    $errors += "Missing doctype: $($file.FullName)"
  }

  $ids = [regex]::Matches($html, '\bid="([^"]+)"') | ForEach-Object { $_.Groups[1].Value }
  $ids | Group-Object | Where-Object Count -gt 1 | ForEach-Object {
    $errors += "Duplicate id '$($_.Name)' in $($file.FullName)"
  }

  $idSet = @{}
  $ids | ForEach-Object { $idSet[$_] = $true }
  $ariaReferences = [regex]::Matches($html, '\b(?:aria-labelledby|aria-describedby|aria-controls)="([^"]+)"')
  foreach ($match in $ariaReferences) {
    foreach ($idReference in ($match.Groups[1].Value -split '\s+')) {
      if ($idReference -and -not $idSet.ContainsKey($idReference)) {
        $errors += "Missing ARIA target '#$idReference' in $($file.FullName)"
      }
    }
  }

  $references = [regex]::Matches($html, '\b(?:href|src)="([^"]+)"') |
    ForEach-Object { $_.Groups[1].Value }

  foreach ($reference in $references) {
    if ($reference -match '^(?:https?:|mailto:|data:)' -or [string]::IsNullOrWhiteSpace($reference)) {
      continue
    }

    $parts = $reference -split '#', 2
    $pathPart = ($parts[0] -split '\?', 2)[0]
    $fragment = if ($parts.Count -gt 1) { $parts[1] } else { '' }

    if ([string]::IsNullOrWhiteSpace($pathPart)) {
      $target = $file.FullName
    } elseif ($pathPart.StartsWith('/')) {
      $target = if ($pathPart -eq '/') {
        Join-Path $root 'index.html'
      } else {
        Join-Path $root $pathPart.TrimStart('/')
      }
    } else {
      $target = [IO.Path]::GetFullPath((Join-Path $file.DirectoryName $pathPart))
    }

    if (Test-Path -LiteralPath $target -PathType Container) {
      $target = Join-Path $target 'index.html'
    }
    if (-not (Test-Path -LiteralPath $target)) {
      $errors += "Broken local reference '$reference' in $($file.FullName)"
      continue
    }
    if ($fragment -and $target.EndsWith('.html')) {
      $targetHtml = Get-Content -LiteralPath $target -Raw
      if ($targetHtml -notmatch ('\bid="' + [regex]::Escape($fragment) + '"')) {
        $errors += "Missing fragment '#$fragment' in $target"
      }
    }
  }
}

foreach ($jsonFile in @('site.webmanifest', 'vercel.json')) {
  try {
    Get-Content -LiteralPath (Join-Path $root $jsonFile) -Raw | ConvertFrom-Json | Out-Null
  } catch {
    $errors += "Invalid JSON: $jsonFile"
  }
}

foreach ($xmlFile in @('sitemap.xml', 'assets\favicon.svg', 'assets\og-card.svg')) {
  try {
    [xml](Get-Content -LiteralPath (Join-Path $root $xmlFile) -Raw) | Out-Null
  } catch {
    $errors += "Invalid XML: $xmlFile"
  }
}

$index = Get-Content -LiteralPath (Join-Path $root 'index.html') -Raw
if ($index -match '<script[^>]+src="scene\.js"') {
  $errors += 'scene.js must remain lazy-loaded so the semantic shell cannot be blocked by WebGL.'
}

if ($errors.Count) {
  $errors | ForEach-Object { Write-Error $_ }
  exit 1
}

Write-Output "PASS: $($htmlFiles.Count) HTML routes; local references, fragments, IDs, ARIA targets, JSON, and XML are valid."
