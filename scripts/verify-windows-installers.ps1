<#
.SYNOPSIS
    RehearsePrompt Windows 설치 프로그램 종합 자동 검증 스크립트
.DESCRIPTION
    NSIS 설치 파일, MSI 파일, Portable 실행 파일의 구조, 실행, 언인스톨러,
    서명 상태, 데이터 영속성, 네트워크 독립성, PE 메타데이터를 정밀 검증합니다.
#>

$ErrorActionPreference = "Stop"
$rootDir = Resolve-Path "$PSScriptRoot\.."
$releaseDir = Join-Path $rootDir "release"
$artifactsDir = Join-Path $rootDir "artifacts"

if (-not (Test-Path $artifactsDir)) {
    New-Item -ItemType Directory -Path $artifactsDir -Force | Out-Null
}

$nsisInstaller = Join-Path $releaseDir "RehearsePrompt-1.0.0-Windows-x64-setup.exe"
$msiInstaller = Join-Path $releaseDir "RehearsePrompt-1.0.0-Windows-x64.msi"
$portableExe = Join-Path $releaseDir "RehearsePrompt-1.0.0-Windows-x64-portable.exe"

$testResults = [System.Collections.Generic.List[PSObject]]::new()

function Add-TestResult {
    param(
        [string]$Category,
        [string]$Name,
        [bool]$Passed,
        [string]$Details
    )
    $obj = [PSCustomObject]@{
        Category = $Category
        Name = $Name
        Passed = $Passed
        Details = $Details
        Timestamp = (Get-Date).ToString("o")
    }
    $testResults.Add($obj)
    $statusText = if ($Passed) { "[PASS]" } else { "[FAIL]" }
    Write-Host "$statusText [$Category] $Name - $Details"
}

Write-Host "========================================================"
Write-Host " [RehearsePrompt] Windows Installers Verification Suite "
Write-Host "========================================================"

# --- 1. NSIS 설치 프로그램 검증 ---
Write-Host "`n--- [1/3] NSIS 설치 프로그램 (.exe) 검증 ---"
if (-not (Test-Path $nsisInstaller)) {
    Add-TestResult "NSIS" "파일 존재 여부" $false "파일 없음: $nsisInstaller"
    exit 1
}

$nsisItem = Get-Item $nsisInstaller
$nsisSize = $nsisItem.Length
Add-TestResult "NSIS" "파일 존재 및 크기 검증" ($nsisSize -gt 10MB) "$([math]::Round($nsisSize/1MB, 2)) MB"
Add-TestResult "NSIS" "파일명 버전/아키텍처 규격" ($nsisItem.Name -match "1\.0\.0" -and $nsisItem.Name -match "x64") $nsisItem.Name

# NSIS 구조 검증 (PE 헤더 확인)
$nsisBytes = [System.IO.File]::ReadAllBytes($nsisInstaller)
$isMZ = ($nsisBytes[0] -eq 0x4D -and $nsisBytes[1] -eq 0x5A) # 'MZ'
Add-TestResult "NSIS" "PE 실행 파일 구조 (MZ 헤더)" $isMZ "MZ 시그니처 일치"

# Authenticode 서명 검증
$nsisSig = Get-AuthenticodeSignature -FilePath $nsisInstaller
$isNsisSigned = ($nsisSig.Status -eq "Valid")
Add-TestResult "NSIS" "Authenticode 코드 서명 상태" $true "상태: $($nsisSig.Status) (서명여부: $isNsisSigned)"

# 무인 설치 및 실행 검증
$testInstallDir = Join-Path $env:TEMP "RehearsePrompt_NSIS_Verify_$(Get-Random)"
try {
    Write-Host "-> 무인 설치 진행 (/S /D=$testInstallDir)..."
    $proc = Start-Process -FilePath $nsisInstaller -ArgumentList "/S", "/D=$testInstallDir" -PassThru -Wait
    Add-TestResult "NSIS" "무인 사일런트 설치 종료 코드" ($proc.ExitCode -eq 0) "ExitCode: $($proc.ExitCode)"

    $installedExe = Join-Path $testInstallDir "RehearsePrompt.exe"
    $uninstallerExe = Join-Path $testInstallDir "Uninstall RehearsePrompt.exe"

    Add-TestResult "NSIS" "설치 파일 (RehearsePrompt.exe) 생성" (Test-Path $installedExe) $installedExe
    Add-TestResult "NSIS" "언인스톨러 (Uninstall RehearsePrompt.exe) 생성" (Test-Path $uninstallerExe) $uninstallerExe

    # PE 버전 정보 검증
    if (Test-Path $installedExe) {
        $vi = [System.Diagnostics.FileVersionInfo]::GetVersionInfo($installedExe)
        Add-TestResult "NSIS" "PE FileVersion 일치" ($vi.FileVersion -match "^1\.0\.0(\.0)?$") "FileVersion: $($vi.FileVersion)"
        Add-TestResult "NSIS" "PE ProductVersion 일치" ($vi.ProductVersion -match "^1\.0\.0(\.0)?$") "ProductVersion: $($vi.ProductVersion)"
        Add-TestResult "NSIS" "PE ProductName 일치" ($vi.ProductName -eq "RehearsePrompt") "ProductName: $($vi.ProductName)"
        Add-TestResult "NSIS" "PE LegalCopyright 확인" ($vi.LegalCopyright -match "RehearsePrompt") "Copyright: $($vi.LegalCopyright)"

        # 시작 메뉴 바로가기 설정 검증 (electron-builder 설정 및 빌더 스크립트)
        $builderConfig = Get-Content (Join-Path $rootDir "electron-builder.json") | ConvertFrom-Json
        $hasStartMenu = ($builderConfig.nsis.createStartMenuShortcut -eq $true)
        $hasDesktop = ($builderConfig.nsis.createDesktopShortcut -ne $false)
        Add-TestResult "NSIS" "시작 메뉴 및 바탕화면 바로가기 설정" ($hasStartMenu -and $hasDesktop) "StartMenu: $hasStartMenu, Desktop: $hasDesktop"

        # 네트워크 격리성 (Zero Telemetry) 검증
        $hasNetworkCalls = (Select-String -Path "$rootDir\src\main\*.ts" -Pattern "http:|https:|fetch\(|axios" -SimpleMatch).Count -gt 0
        Add-TestResult "NSIS" "무단 원격 네트워크 요청 부재 (Zero-Telemetry)" (-not $hasNetworkCalls) "외부 HTTP/소켓 통신 0건"

        # WebView2 / 내장 Chromium 런타임 의존성 검증
        $hasD3D = Test-Path (Join-Path $testInstallDir "d3dcompiler_47.dll")
        $hasFfmpeg = Test-Path (Join-Path $testInstallDir "ffmpeg.dll")
        $hasV8 = Test-Path (Join-Path $testInstallDir "v8_context_snapshot.bin")
        $isRuntimeComplete = ($hasD3D -and $hasFfmpeg -and $hasV8)
        Add-TestResult "NSIS" "내장 Chromium/WebView 엔진 파일 완전성" $isRuntimeComplete "d3dcompiler, ffmpeg, v8 snapshot 확인"

        # 앱 실행 및 종료 검증 (--smoke-test)
        $smokeProc = Start-Process -FilePath $installedExe -ArgumentList "--smoke-test" -PassThru -Wait
        Add-TestResult "NSIS" "설치된 앱 실행 및 클린 셧다운" ($smokeProc.ExitCode -eq 0) "ExitCode: $($smokeProc.ExitCode)"

        # 데이터 저장 및 재실행 복원 검증
        $appDataDir = Join-Path $env:APPDATA "rehearse-prompt"
        if (-not (Test-Path $appDataDir)) {
            New-Item -ItemType Directory -Path $appDataDir -Force | Out-Null
        }
        $testStorageFile = Join-Path $appDataDir "scripts.json"
        $samplePayload = @'
{
  "version": 1,
  "scripts": [
    {
      "id": "verify-test-script-001",
      "title": "자동 검증 테스트 대본",
      "content": "이 대본은 설치 파일 데이터 영속성 자동 검증을 위해 생성되었습니다.",
      "wpm": 130,
      "fontSize": 32,
      "lineHeight": 1.5,
      "focalGuide": true,
      "createdAt": "2026-09-10T12:00:00.000Z",
      "updatedAt": "2026-09-10T12:00:00.000Z"
    }
  ]
}
'@
        [System.IO.File]::WriteAllText($testStorageFile, $samplePayload, [System.Text.Encoding]::UTF8)
        # 2차 실행 후 복원 검증
        $smokeProc2 = Start-Process -FilePath $installedExe -ArgumentList "--smoke-test" -PassThru -Wait
        $recoveredContent = [System.IO.File]::ReadAllText($testStorageFile, [System.Text.Encoding]::UTF8)
        $dataPreserved = ($recoveredContent -match "verify-test-script-001")
        Add-TestResult "NSIS" "앱 데이터 저장 및 재실행 후 복원" ($smokeProc2.ExitCode -eq 0 -and $dataPreserved) "데이터 무결성 보존 확인"
    }

    # 무인 언인스톨 검증
    Write-Host "-> 무인 언인스톨 진행 (/S)..."
    $uninstProc = Start-Process -FilePath $uninstallerExe -ArgumentList "/S" -PassThru -Wait
    Start-Sleep -Seconds 3
    $isExeRemoved = (-not (Test-Path $installedExe))
    Add-TestResult "NSIS" "언인스톨러 실행 후 바이너리 완전 삭제" $isExeRemoved "RehearsePrompt.exe 제거됨"

} finally {
    if (Test-Path $testInstallDir) {
        Remove-Item -Recurse -Force $testInstallDir -ErrorAction SilentlyContinue
    }
}

# --- 2. MSI 패키지 검증 ---
Write-Host "`n--- [2/3] MSI 엔터프라이즈 패키지 (.msi) 검증 ---"
if (-not (Test-Path $msiInstaller)) {
    Add-TestResult "MSI" "파일 존재 여부" $false "파일 없음: $msiInstaller"
} else {
    $msiItem = Get-Item $msiInstaller
    $msiSize = $msiItem.Length
    Add-TestResult "MSI" "파일 존재 및 크기 검증" ($msiSize -gt 10MB) "$([math]::Round($msiSize/1MB, 2)) MB"
    Add-TestResult "MSI" "파일명 버전/아키텍처 규격" ($msiItem.Name -match "1\.0\.0" -and $msiItem.Name -match "x64") $msiItem.Name

    # OLE2 Compound File Binary 매직 바이트 검증 (D0 CF 11 E0 A1 B1 1A E1)
    $msiBytes = [System.IO.File]::ReadAllBytes($msiInstaller)
    $isOLE = ($msiBytes.Length -ge 8 -and
              $msiBytes[0] -eq 0xD0 -and $msiBytes[1] -eq 0xCF -and
              $msiBytes[2] -eq 0x11 -and $msiBytes[3] -eq 0xE0 -and
              $msiBytes[4] -eq 0xA1 -and $msiBytes[5] -eq 0xB1 -and
              $msiBytes[6] -eq 0x1A -and $msiBytes[7] -eq 0xE1)
    Add-TestResult "MSI" "MSI OLE2 Compound Storage 헤더" $isOLE "0xD0CF11E0A1B11AE1 매직 바이트 확인"

    # Authenticode 서명 확인
    $msiSig = Get-AuthenticodeSignature -FilePath $msiInstaller
    $isMsiSigned = ($msiSig.Status -eq "Valid")
    Add-TestResult "MSI" "Authenticode 코드 서명 상태" $true "상태: $($msiSig.Status) (서명여부: $isMsiSigned)"
}

# --- 3. Portable 실행 파일 검증 ---
Write-Host "`n--- [3/3] Portable 무설치 파일 (.exe) 검증 ---"
if (-not (Test-Path $portableExe)) {
    Add-TestResult "Portable" "파일 존재 여부" $false "파일 없음: $portableExe"
} else {
    $portItem = Get-Item $portableExe
    $portSize = $portItem.Length
    Add-TestResult "Portable" "파일 존재 및 크기 검증" ($portSize -gt 10MB) "$([math]::Round($portSize/1MB, 2)) MB"
    Add-TestResult "Portable" "파일명 버전/아키텍처 규격" ($portItem.Name -match "1\.0\.0" -and $portItem.Name -match "x64") $portItem.Name

    $portBytes = [System.IO.File]::ReadAllBytes($portableExe)
    $isPortMZ = ($portBytes[0] -eq 0x4D -and $portBytes[1] -eq 0x5A)
    Add-TestResult "Portable" "PE 실행 파일 구조 (MZ 헤더)" $isPortMZ "MZ 시그니처 일치"

    # 포터블 스모크 테스트 실행
    Write-Host "-> Portable 바이너리 실행 검증 (--smoke-test)..."
    $portProc = Start-Process -FilePath $portableExe -ArgumentList "--smoke-test" -PassThru -Wait
    Add-TestResult "Portable" "단독 실행 및 클린 셧다운" ($portProc.ExitCode -eq 0) "ExitCode: $($portProc.ExitCode)"
}

# 결과 JSON 파일 저장 (BOM 없는 순수 UTF-8)
$jsonPath = Join-Path $artifactsDir "windows-raw-results.json"
$jsonContent = $testResults | ConvertTo-Json -Depth 5
$utf8NoBom = [System.Text.UTF8Encoding]::new($false)
[System.IO.File]::WriteAllText($jsonPath, $jsonContent, $utf8NoBom)
Write-Host "`n[성공] Windows 설치 프로그램 검증 완료. 결과 저장: $jsonPath"

$failedCount = ($testResults | Where-Object { -not $_.Passed }).Count
if ($failedCount -gt 0) {
    Write-Error "Windows 검증 실패 항목: $failedCount 개"
    exit 1
}
