# AI proxy watchdog: TCP-only health check (never hangs), auto restart
$ErrorActionPreference = 'Continue'
$here   = Split-Path -Parent $MyInvocation.MyCommand.Definition
$parent = Split-Path $here -Parent
$proxy  = Join-Path $here 'ai-proxy.mjs'
$log    = Join-Path $here 'ai-proxy-watchdog.log'
$port   = 4318

$node = Join-Path $parent 'agh-setup\node-v24.21.0-win-x64\node.exe'
if (-not (Test-Path $node)) {
  $alt = Join-Path $parent 'runtime\node\node.exe'
  if (Test-Path $alt) { $node = $alt } else { $node = 'node' }
}

function Write-Log([string]$msg) {
  try {
    if ((Test-Path $log) -and ((Get-Item $log).Length -gt 2097152)) { Remove-Item $log -Force -ErrorAction SilentlyContinue }
    ('[' + (Get-Date -Format 'yyyy-MM-dd HH:mm:ss') + '] ' + $msg) | Out-File -FilePath $log -Append -Encoding UTF8
  } catch { }
}

function Test-Port([int]$p) {
  $c = $null
  try {
    $c = New-Object System.Net.Sockets.TcpClient
    $iar = $c.BeginConnect('127.0.0.1', $p, $null, $null)
    $ok = $iar.AsyncWaitHandle.WaitOne(3000, $false)
    if ($ok -and $c.Connected) { return $true }
    return $false
  } catch { return $false } finally { if ($c) { try { $c.Close() } catch { } } }
}

Write-Log ('watchdog start node=' + $node)
$child = $null
$lastState = ''
$n = 0

while ($true) {
  try {
    $n = $n + 1
    $alive = Test-Port $port
    if ($alive) {
      if ($lastState -eq 'down') { Write-Log 'proxy is up again' }
      $lastState = 'up'
      if ($n % 30 -eq 0) { Write-Log 'heartbeat ok' }
      Start-Sleep -Seconds 10
      continue
    }
    if ($lastState -ne 'down') { Write-Log 'proxy not responding, starting it' }
    $lastState = 'down'
    if ($child -ne $null) { try { if (-not $child.HasExited) { $child.Kill() } } catch { } ; $child = $null }
    Start-Sleep -Seconds 2
    try {
      $child = Start-Process -FilePath $node -ArgumentList $proxy -WorkingDirectory $here -WindowStyle Hidden -PassThru -ErrorAction Stop
      Write-Log ('started proxy pid ' + $child.Id)
    } catch {
      Write-Log ('start failed ' + $_.Exception.Message)
    }
    Start-Sleep -Seconds 8
  } catch {
    try { Write-Log ('loop error ' + $_.Exception.Message) } catch { }
    Start-Sleep -Seconds 10
  }
}