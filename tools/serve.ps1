param(
  [int]$Port = 4173,
  [string]$Root = (Split-Path -Parent $PSScriptRoot)
)

$ErrorActionPreference = 'Stop'
$rootPath = [IO.Path]::GetFullPath($Root).TrimEnd([IO.Path]::DirectorySeparatorChar)
$rootPrefix = $rootPath + [IO.Path]::DirectorySeparatorChar
$listener = [Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback, $Port)

$mimeTypes = @{
  '.html' = 'text/html; charset=utf-8'
  '.css' = 'text/css; charset=utf-8'
  '.js' = 'text/javascript; charset=utf-8'
  '.json' = 'application/json; charset=utf-8'
  '.webmanifest' = 'application/manifest+json; charset=utf-8'
  '.xml' = 'application/xml; charset=utf-8'
  '.svg' = 'image/svg+xml'
  '.png' = 'image/png'
  '.jpg' = 'image/jpeg'
  '.jpeg' = 'image/jpeg'
  '.webp' = 'image/webp'
  '.avif' = 'image/avif'
  '.ico' = 'image/x-icon'
  '.woff2' = 'font/woff2'
  '.pdf' = 'application/pdf'
  '.txt' = 'text/plain; charset=utf-8'
}

try {
  $listener.Start()
  Write-Output "Serving $rootPath at http://127.0.0.1:$Port/"

  while ($true) {
    $client = $listener.AcceptTcpClient()
    $stream = $client.GetStream()
    try {
      $reader = [IO.StreamReader]::new($stream, [Text.Encoding]::ASCII, $false, 1024, $true)
      $requestLine = $reader.ReadLine()
      if ([string]::IsNullOrWhiteSpace($requestLine)) {
        continue
      }
      $requestParts = $requestLine -split ' '
      if ($requestParts.Count -lt 2) {
        continue
      }
      $method = $requestParts[0].ToUpperInvariant()
      $rawTarget = ($requestParts[1] -split '\?', 2)[0]
      while (($headerLine = $reader.ReadLine()) -ne $null -and $headerLine -ne '') { }

      $statusCode = 200
      $statusText = 'OK'
      $relative = [Uri]::UnescapeDataString($rawTarget).TrimStart('/')
      if ([string]::IsNullOrWhiteSpace($relative)) {
        $relative = 'index.html'
      }

      $relative = $relative.Replace('/', [IO.Path]::DirectorySeparatorChar)
      $target = [IO.Path]::GetFullPath((Join-Path $rootPath $relative))
      $insideRoot = $target.Equals($rootPath, [StringComparison]::OrdinalIgnoreCase) -or
        $target.StartsWith($rootPrefix, [StringComparison]::OrdinalIgnoreCase)

      if (-not $insideRoot) {
        $target = Join-Path $rootPath '404.html'
        $statusCode = 404
        $statusText = 'Not Found'
      } elseif (Test-Path -LiteralPath $target -PathType Container) {
        $target = Join-Path $target 'index.html'
      }

      if (-not (Test-Path -LiteralPath $target -PathType Leaf)) {
        $target = Join-Path $rootPath '404.html'
        $statusCode = 404
        $statusText = 'Not Found'
      }

      $extension = [IO.Path]::GetExtension($target).ToLowerInvariant()
      $contentType = if ($mimeTypes.ContainsKey($extension)) {
        $mimeTypes[$extension]
      } else {
        'application/octet-stream'
      }

      $bytes = [IO.File]::ReadAllBytes($target)
      $responseHead = @(
        "HTTP/1.1 $statusCode $statusText"
        "Content-Type: $contentType"
        "Content-Length: $($bytes.Length)"
        'Cache-Control: no-cache'
        'X-Content-Type-Options: nosniff'
        'Referrer-Policy: strict-origin-when-cross-origin'
        'Connection: close'
        ''
        ''
      ) -join "`r`n"
      $headBytes = [Text.Encoding]::ASCII.GetBytes($responseHead)
      $stream.Write($headBytes, 0, $headBytes.Length)
      if ($method -ne 'HEAD') {
        $stream.Write($bytes, 0, $bytes.Length)
      }
    } catch {
      $message = [Text.Encoding]::UTF8.GetBytes('Internal server error')
      $responseHead = "HTTP/1.1 500 Internal Server Error`r`nContent-Type: text/plain; charset=utf-8`r`nContent-Length: $($message.Length)`r`nConnection: close`r`n`r`n"
      $headBytes = [Text.Encoding]::ASCII.GetBytes($responseHead)
      try {
        $stream.Write($headBytes, 0, $headBytes.Length)
        $stream.Write($message, 0, $message.Length)
      } catch { }
      Write-Warning $_
    } finally {
      if ($reader) { $reader.Dispose() }
      $stream.Dispose()
      $client.Dispose()
    }
  }
} finally {
  $listener.Stop()
}
