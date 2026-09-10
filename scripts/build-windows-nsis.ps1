<#
.SYNOPSIS
    RehearsePrompt Windows NSIS & Portable 패키지 빌더
.DESCRIPTION
    NSIS 표준 인스톨러와 무설치 Portable 실행 파일을 빌드하고 무결성을 검증합니다.
#>

$ErrorActionPreference = "Stop"
$rootDir = Resolve-Path "$PSScriptRoot\.."
$releaseDir = Join-Path $rootDir "release"

Write-Host "========================================================"
Write-Host " [RehearsePrompt] Building Windows NSIS & Portable     "
Write-Host "========================================================"

# 1. 렌더러 및 일렉트론 번들 컴파일
Write-Host "-> [Step 1/3] Compiling React Renderer & Electron Main..."
& npm.cmd run build
if ($LASTEXITCODE -ne 0) {
    Write-Error "애플리케이션 번들 컴파일에 실패했습니다."
    exit 1
}

# 2. electron-builder 패키징 실행 (NSIS & Portable)
Write-Host "`n-> [Step 2/3] Packaging NSIS Installer & Portable Executable..."
& npx.cmd electron-builder --win nsis portable
if ($LASTEXITCODE -ne 0) {
    Write-Error "Windows NSIS/Portable 패키징에 실패했습니다."
    exit 1
}

# 3. 산출물 실제 생성 및 크기 검증 (Zero-False-Success 보장)
Write-Host "`n-> [Step 3/3] Verifying Output Binary Integrity..."

$expectedFiles = @(
    "RehearsePrompt-1.0.0-Windows-x64-setup.exe",
    "RehearsePrompt-1.0.0-Windows-x64-portable.exe"
)

# 기존 명명 산출물이 있을 경우 표준 이름으로 동기화
if ((Test-Path "$releaseDir\RehearsePrompt-Setup-1.0.0.exe") -and (-not (Test-Path "$releaseDir\RehearsePrompt-1.0.0-Windows-x64-setup.exe"))) {
    Copy-Item "$releaseDir\RehearsePrompt-Setup-1.0.0.exe" "$releaseDir\RehearsePrompt-1.0.0-Windows-x64-setup.exe" -Force
}
if ((Test-Path "$releaseDir\RehearsePrompt-1.0.0-Portable.exe") -and (-not (Test-Path "$releaseDir\RehearsePrompt-1.0.0-Windows-x64-portable.exe"))) {
    Copy-Item "$releaseDir\RehearsePrompt-1.0.0-Portable.exe" "$releaseDir\RehearsePrompt-1.0.0-Windows-x64-portable.exe" -Force
}

foreach ($fileName in $expectedFiles) {
    $fullPath = Join-Path $releaseDir $fileName
    if (-not (Test-Path $fullPath)) {
        Write-Error "필수 산출물 파일이 생성되지 않았습니다: $fileName"
        exit 1
    }

    $item = Get-Item $fullPath
    $sizeMB = [math]::Round($item.Length / 1MB, 2)
    if ($item.Length -lt 10MB) {
        Write-Error "산출물 크기가 비정상적으로 작습니다 (${sizeMB} MB): $fileName"
        exit 1
    }

    $hash = (Get-FileHash -Path $fullPath -Algorithm SHA256).Hash
    Write-Host "   [성공] $fileName (${sizeMB} MB) | SHA-256: $hash"
}

Write-Host "`n=== Windows NSIS & Portable Build Succeeded ==="
Write-Host "========================================================`n"
