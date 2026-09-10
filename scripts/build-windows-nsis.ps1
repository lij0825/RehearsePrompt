<#
.SYNOPSIS
    RehearsePrompt Windows NSIS & Portable 패키지 빌더
.DESCRIPTION
    NSIS 표준 인스톨러와 무설치 Portable 실행 파일을 빌드하고 무결성을 검증합니다.
#>

$ErrorActionPreference = "Stop"
$PSNativeCommandUseErrorActionPreference = $false
$rootDir = Resolve-Path "$PSScriptRoot\.."
$releaseDir = Join-Path $rootDir "release"

Write-Host "========================================================"
Write-Host " [RehearsePrompt] Building Windows NSIS & Portable     "
Write-Host "========================================================"

# 1. Compile React renderer and Electron main (if not already built)
Write-Host "-> [Step 1/3] Compiling React Renderer & Electron Main..."
if (-not (Test-Path "$rootDir\dist") -or -not (Test-Path "$rootDir\dist-electron")) {
	& npm.cmd run build
	if ($LASTEXITCODE -ne 0) {
		Write-Error "Failed to compile application bundle."
		exit 1
	}
} else {
	Write-Host "   Application bundle already compiled. Skipping npm run build."
}

# 2. Package NSIS installer & Portable executable
Write-Host "`n-> [Step 2/3] Packaging NSIS Installer & Portable Executable..."
& npx.cmd electron-builder --win nsis portable --publish never
if ($LASTEXITCODE -ne 0) {
	Write-Error "Windows NSIS/Portable packaging failed."
	exit 1
}

# 3. Verify output binary integrity
Write-Host "`n-> [Step 3/3] Verifying Output Binary Integrity..."

$expectedFiles = @(
    "RehearsePrompt-1.0.0-Windows-x64-setup.exe",
    "RehearsePrompt-1.0.0-Windows-x64-portable.exe"
)

# Synchronize legacy names if present
if ((Test-Path "$releaseDir\RehearsePrompt-Setup-1.0.0.exe") -and (-not (Test-Path "$releaseDir\RehearsePrompt-1.0.0-Windows-x64-setup.exe"))) {
    Copy-Item "$releaseDir\RehearsePrompt-Setup-1.0.0.exe" "$releaseDir\RehearsePrompt-1.0.0-Windows-x64-setup.exe" -Force
}
if ((Test-Path "$releaseDir\RehearsePrompt-1.0.0-Portable.exe") -and (-not (Test-Path "$releaseDir\RehearsePrompt-1.0.0-Windows-x64-portable.exe"))) {
    Copy-Item "$releaseDir\RehearsePrompt-1.0.0-Portable.exe" "$releaseDir\RehearsePrompt-1.0.0-Windows-x64-portable.exe" -Force
}

foreach ($fileName in $expectedFiles) {
    $fullPath = Join-Path $releaseDir $fileName
    if (-not (Test-Path $fullPath)) {
        Write-Error "Required artifact file was not created: $fileName"
        exit 1
    }

    $item = Get-Item $fullPath
    $sizeMB = [math]::Round($item.Length / 1MB, 2)
    if ($item.Length -lt 10MB) {
        Write-Error "Artifact size is too small (${sizeMB} MB): $fileName"
        exit 1
    }

    $hash = (Get-FileHash -Path $fullPath -Algorithm SHA256).Hash
    Write-Host "   [Success] $fileName (${sizeMB} MB) | SHA-256: $hash"
}

Write-Host "`n=== Windows NSIS & Portable Build Succeeded ==="
Write-Host "========================================================`n"
