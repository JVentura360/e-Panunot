param(
    [Parameter(Mandatory = $true)][string]$TunnelUrl,
    [string]$PhpPath = 'C:\php84\php.exe',
    [ValidateRange(1024, 65535)][int]$Port = 8000
)

$ErrorActionPreference = 'Stop'
$phoneListeners = @(Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue)
if ($phoneListeners.Count -gt 0) {
    $phoneOwners = ($phoneListeners.OwningProcess | Sort-Object -Unique) -join ', '
    throw "Port $Port is already in use by process $phoneOwners. Stop the old backend/Artisan server before starting phone mode."
}
$phoneUri = [Uri]$TunnelUrl
if ($phoneUri.Scheme -ne 'https' -or -not $phoneUri.Host.EndsWith('.devtunnels.ms') -or -not $phoneUri.IsDefaultPort -or $phoneUri.UserInfo) {
    throw 'Use the HTTPS Dev Tunnel URL ending in .devtunnels.ms, without a port.'
}
$phoneSettings = @{
    FRONTEND_URL = $phoneUri.GetLeftPart([UriPartial]::Authority)
    SANCTUM_STATEFUL_DOMAINS = "$($phoneUri.Host),localhost:5173,localhost:8000"
    SESSION_DOMAIN = $phoneUri.Host
    SESSION_SECURE_COOKIE = 'true'
    SESSION_SAME_SITE = 'lax'
}
$previousSettings = @{}
foreach ($key in $phoneSettings.Keys) {
    $previousSettings[$key] = [Environment]::GetEnvironmentVariable($key, 'Process')
}
Push-Location (Join-Path $PSScriptRoot '../backend')
try {
    foreach ($key in $phoneSettings.Keys) { [Environment]::SetEnvironmentVariable($key, $phoneSettings[$key], 'Process') }
    & $PhpPath artisan config:clear
    if ($LASTEXITCODE -ne 0) { throw 'Could not clear cached backend configuration.' }
    # Start the same PHP/router pair as Artisan, without its child-environment filtering.
    $phoneRouter = Join-Path (Get-Location) 'vendor/laravel/framework/src/Illuminate/Foundation/resources/server.php'
    if (-not (Test-Path -LiteralPath $phoneRouter)) { throw 'Laravel dependencies are missing. Run composer install first.' }
    Write-Host "Phone backend: http://127.0.0.1:$Port (keep this terminal open; Ctrl+C stops it)"
    Push-Location public
    try { & $PhpPath -S "127.0.0.1:$Port" $phoneRouter }
    finally { Pop-Location }
    if ($LASTEXITCODE -ne 0) { throw "Backend did not start. Stop the existing backend on port $Port first." }
} finally {
    foreach ($key in $phoneSettings.Keys) { [Environment]::SetEnvironmentVariable($key, $previousSettings[$key], 'Process') }
    Pop-Location
}
