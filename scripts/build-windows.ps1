<#
.SYNOPSIS
    RehearsePrompt Windows 통합 배포 빌드 파이프라인
.DESCRIPTION
    환경 점검, 버전 검증, 아이콘 생성, NSIS/Portable/MSI 빌드, 코드 서명 및 체크섬 생성을 일괄 오케스트레이션합니다.
#>

$ErrorActionPreference = "Stop"

Write-Host "########################################################"
Write-Host " [RehearsePrompt] Windows Complete Build Pipeline       "
Write-Host "########################################################"

# 1. 환경 및 버전 검증
Write-Host "`n[1/6] Running Environment & Version Verification..."
& "$PSScriptRoot\check-environment.ps1"
& node "$PSScriptRoot\check-version.mjs"

# 2. 아이콘 자산 생성
Write-Host "`n[2/6] Generating Multi-Platform Icons..."
& "$PSScriptRoot\generate-icons.ps1"

# 3. Windows NSIS & Portable 패키징
Write-Host "`n[3/6] Building NSIS & Portable Packages..."
& "$PSScriptRoot\build-windows-nsis.ps1"

# 4. Windows Enterprise MSI 패키징
Write-Host "`n[4/6] Building MSI Package..."
& "$PSScriptRoot\build-windows-msi.ps1"

# 5. 코드 서명 실행 (서명 자격 증명 부재 시 테스트 모드 통과)
Write-Host "`n[5/6] Executing Code Signing Pipeline..."
& "$PSScriptRoot\sign-windows.ps1"

# 6. 체크섬 생성 및 산출물 최종 검증
Write-Host "`n[6/6] Generating Checksums & Verifying Artifacts..."
& node "$PSScriptRoot\generate-checksums.mjs"
& node "$PSScriptRoot\verify-artifacts.mjs"

Write-Host "`n########################################################"
Write-Host " [성공] Windows 전체 패키지 빌드 파이프라인 완료!        "
Write-Host "########################################################`n"
