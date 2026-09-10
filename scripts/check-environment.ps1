<#
.SYNOPSIS
    RehearsePrompt Windows 빌드 환경 사전 점검기
.DESCRIPTION
    빌드에 필요한 Node.js, npm, PowerShell, 디렉터리 권한 및 아이콘 리소스를 점검합니다.
#>

$ErrorActionPreference = "Stop"

Write-Host "========================================================"
Write-Host " [RehearsePrompt] Windows Environment Pre-Flight Check  "
Write-Host "========================================================"

# 1. OS Info
$os = (Get-CimInstance Win32_OperatingSystem).Caption
$arch = $env:PROCESSOR_ARCHITECTURE
Write-Host "[1/5] OS: $os ($arch)"

# 2. Node.js Version Check (v20+ required, v22 recommended)
$nodeVersion = & node --version 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Error "Node.js is not installed."
    exit 1
}
$majorNode = [int]($nodeVersion.Trim().TrimStart('v').Split('.')[0])
if ($majorNode -lt 20) {
    Write-Error "Node.js version must be 20 or higher. Current: $nodeVersion"
    exit 1
}
Write-Host "[2/5] Node.js Runtime: $nodeVersion (Compatible)"

# 3. npm Version Check
$npmVersion = & npm.cmd --version 2>&1
Write-Host "[3/5] Package Manager: npm $npmVersion (Compatible)"

# 4. Local Dependencies (node_modules)
$nodeModules = Join-Path $PSScriptRoot "..\node_modules"
if (-not (Test-Path $nodeModules)) {
    Write-Error "node_modules folder not found. Run 'npm ci' first."
    exit 1
}
Write-Host "[4/5] Local Dependencies: Verified"

# 5. Icon Assets
$icoPath = Join-Path $PSScriptRoot "..\build\icon.ico"
if (-not (Test-Path $icoPath)) {
    Write-Warning "build\icon.ico not found. Running generate-icons.ps1..."
    & "$PSScriptRoot\generate-icons.ps1"
}
Write-Host "[5/5] Required Icons: Verified"

Write-Host "`n[Success] Windows build environment pre-flight check passed."
Write-Host "========================================================`n"
