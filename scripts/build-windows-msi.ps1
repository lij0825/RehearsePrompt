<#
.SYNOPSIS
    RehearsePrompt Windows MSI 패키지 빌더
.DESCRIPTION
    기업 및 교육기관 대량 배포용 MSI 패키지를 빌드하고 무결성을 검증합니다.
#>

$ErrorActionPreference = "Stop"
$rootDir = Resolve-Path "$PSScriptRoot\.."
$releaseDir = Join-Path $rootDir "release"

Write-Host "========================================================"
Write-Host " [RehearsePrompt] Building Windows Enterprise MSI       "
Write-Host "========================================================"

# 1. 렌더러 및 일렉트론 번들 컴파일
Write-Host "-> [Step 1/3] Compiling React Renderer & Electron Main..."
& npm.cmd run build
if ($LASTEXITCODE -ne 0) {
    Write-Error "애플리케이션 번들 컴파일에 실패했습니다."
    exit 1
}

# 2. electron-builder MSI 패키징 실행
Write-Host "`n-> [Step 2/3] Packaging Windows Enterprise MSI..."
& npx.cmd electron-builder --win msi
if ($LASTEXITCODE -ne 0) {
    Write-Error "Windows MSI 패키징에 실패했습니다."
    exit 1
}

# 3. 산출물 실제 생성 및 크기 검증
Write-Host "`n-> [Step 3/3] Verifying MSI Package Integrity..."

$msiStandard = "RehearsePrompt-1.0.0-Windows-x64.msi"
$msiLegacy = "RehearsePrompt-Setup-1.0.0.msi"

if ((Test-Path "$releaseDir\$msiLegacy") -and (-not (Test-Path "$releaseDir\$msiStandard"))) {
    Copy-Item "$releaseDir\$msiLegacy" "$releaseDir\$msiStandard" -Force
}

$msiPath = Join-Path $releaseDir $msiStandard
if (-not (Test-Path $msiPath)) {
    Write-Error "MSI 필수 산출물 파일이 생성되지 않았습니다: $msiStandard"
    exit 1
}

$item = Get-Item $msiPath
$sizeMB = [math]::Round($item.Length / 1MB, 2)
if ($item.Length -lt 10MB) {
    Write-Error "MSI 파일 크기가 비정상적으로 작습니다 (${sizeMB} MB): $msiStandard"
    exit 1
}

$hash = (Get-FileHash -Path $msiPath -Algorithm SHA256).Hash
Write-Host "   [성공] $msiStandard (${sizeMB} MB) | SHA-256: $hash"

Write-Host "`n=== Windows Enterprise MSI Build Succeeded ==="
Write-Host "========================================================`n"
