$port = 4173
$listener = Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue
if (-not $listener) {
  Start-Process -FilePath 'node' -ArgumentList 'server.mjs' -WorkingDirectory $PSScriptRoot -WindowStyle Hidden
  for ($i = 0; $i -lt 40; $i++) {
    Start-Sleep -Milliseconds 250
    $listener = Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue
    if ($listener) { break }
  }
}
if (-not $listener) {
  Add-Type -AssemblyName PresentationFramework
  [System.Windows.MessageBox]::Show('Judo could not start. Make sure Node.js is installed and check the local setup instructions.') | Out-Null
  exit 1
}
Start-Process 'http://127.0.0.1:4173'


