# Tiny static file server for local testing. The games also run straight from
# index.html on the file system - this is only here for the preview pane.
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add('http://localhost:5173/')
$listener.Start()
Write-Output "serving $root on http://localhost:5173/"
while ($listener.IsListening) {
  try {
    $ctx = $listener.GetContext()
    $rel = [Uri]::UnescapeDataString($ctx.Request.Url.LocalPath).TrimStart('/')
    if ([string]::IsNullOrWhiteSpace($rel)) { $rel = 'index.html' }
    $file = Join-Path $root $rel
    if (Test-Path -LiteralPath $file -PathType Leaf) {
      $bytes = [System.IO.File]::ReadAllBytes($file)
      $ext = [System.IO.Path]::GetExtension($file).ToLower()
      switch ($ext) {
        '.html' { $type = 'text/html; charset=utf-8' }
        '.css'  { $type = 'text/css; charset=utf-8' }
        '.js'   { $type = 'application/javascript; charset=utf-8' }
        '.json' { $type = 'application/json; charset=utf-8' }
        '.wav'  { $type = 'audio/wav' }
        '.mp3'  { $type = 'audio/mpeg' }
        default { $type = 'application/octet-stream' }
      }
      $ctx.Response.ContentType = $type
      $ctx.Response.Headers.Add('Cache-Control', 'no-store')
      $ctx.Response.ContentLength64 = $bytes.Length
      $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
      Write-Output "200 $rel"
    } else {
      $ctx.Response.StatusCode = 404
      Write-Output "404 $rel"
    }
    $ctx.Response.Close()
  } catch {
    Write-Output "ERR $($_.Exception.Message)"
  }
}
