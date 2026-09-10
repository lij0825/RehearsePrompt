<#
.SYNOPSIS
    RehearsePrompt Windows 설치 프로그램 자동화 테스트 러너
.DESCRIPTION
    빌드된 NSIS 설치 프로그램을 무인 설치하고, 정상 실행 및 종료를 확인한 후 언인스톨을 검증합니다.
#>

$ErrorActionPreference = "Stop"
$rootDir = Resolve-Path "$PSScriptRoot\.."
$installer = Join-Path $rootDir "release\RehearsePrompt-1.0.0-Windows-x64-setup.exe"
$testDir = Join-Path $env:TEMP "RehearsePrompt_Installer_Test_$(Get-Random)"

Write-Host "========================================================"
Write-Host " [RehearsePrompt] Windows Installer Automated Test      "
Write-Host "========================================================"

if (-not (Test-Path $installer)) {
    Write-Error "설치 파일이 없습니다: $installer"
    exit 1
}

Write-Host "1. 테스트 대상 설치 파일: $(Get-Item $installer).Name"
Write-Host "2. 임시 설치 디렉터리: $testDir"

try {
    # 1. 무인 사일런트 설치 실행
    Write-Host "`n-> [테스트 1] 무인 설치 (/S /D=...) 진행 중..."
    $instProc = Start-Process -FilePath $installer -ArgumentList "/S", "/D=$testDir" -PassThru -Wait
    if ($instProc.ExitCode -ne 0) {
        Write-Error "설치 프로그램이 비정상 종료되었습니다 (ExitCode: $($instProc.ExitCode))"
        exit 1
    }

    $installedExe = Join-Path $testDir "RehearsePrompt.exe"
    if (-not (Test-Path $installedExe)) {
        Write-Error "설치 디렉터리에 실행 파일이 존재하지 않습니다: $installedExe"
        exit 1
    }
    Write-Host "   [통과] 설치 완료 확인 (RehearsePrompt.exe 존재)"

    # 2. 설치된 실행 파일 스모크 테스트 실행
    Write-Host "`n-> [테스트 2] 설치된 바이너리 실행 및 셧다운 검증 (--smoke-test)..."
    $appProc = Start-Process -FilePath $installedExe -ArgumentList "--smoke-test" -PassThru -Wait
    if ($appProc.ExitCode -ne 0) {
        Write-Error "설치된 앱 실행 검증에 실패했습니다 (ExitCode: $($appProc.ExitCode))"
        exit 1
    }
    Write-Host "   [통과] 설치된 앱 정상 구동 및 클린 셧다운 확인 (ExitCode: 0)"

    # 3. 언인스톨러 실행
    Write-Host "`n-> [테스트 3] 무인 언인스톨러 (/S) 실행 및 클린업 검증..."
    $uninstExe = Join-Path $testDir "Uninstall RehearsePrompt.exe"
    if (-not (Test-Path $uninstExe)) {
        Write-Error "언인스톨러 파일이 없습니다: $uninstExe"
        exit 1
    }

    $uninstProc = Start-Process -FilePath $uninstExe -ArgumentList "/S" -PassThru -Wait
    Start-Sleep -Seconds 3

    if (Test-Path $installedExe) {
        Write-Error "언인스톨 후에도 실행 파일이 남아 있습니다."
        exit 1
    }
    Write-Host "   [통과] 언인스톨러 클린 삭제 완료 확인"

} finally {
    if (Test-Path $testDir) {
        Remove-Item -Recurse -Force $testDir -ErrorAction SilentlyContinue
    }
}

Write-Host "`n[성공] Windows 설치 프로그램 3단계 자동화 테스트 전체 통과!"
Write-Host "========================================================`n"
