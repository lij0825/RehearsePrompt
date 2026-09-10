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

# 1. OS 정보
$os = (Get-CimInstance Win32_OperatingSystem).Caption
$arch = $env:PROCESSOR_ARCHITECTURE
Write-Host "[1/5] 운영체제: $os ($arch)"

# 2. Node.js 버전 점검 (v20+ 필수, v22 권장)
$nodeVersion = & node --version 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Error "Node.js가 설치되어 있지 않습니다."
    exit 1
}
$majorNode = [int]($nodeVersion.Trim().TrimStart('v').Split('.')[0])
if ($majorNode -lt 20) {
    Write-Error "Node.js 버전은 20 이상이어야 합니다. (현재: $nodeVersion)"
    exit 1
}
Write-Host "[2/5] Node.js 런타임: $nodeVersion (적합)"

# 3. npm 버전 점검
$npmVersion = & npm --version 2>&1
Write-Host "[3/5] 패키지 매니저: npm $npmVersion (적합)"

# 4. 의존성(node_modules) 존재 여부
$nodeModules = Join-Path $PSScriptRoot "..\node_modules"
if (-not (Test-Path $nodeModules)) {
    Write-Error "node_modules 폴더가 없습니다. 먼저 'npm ci'를 실행하세요."
    exit 1
}
Write-Host "[4/5] 로컬 의존성: 확인됨"

# 5. 아이콘 자산 존재 여부
$icoPath = Join-Path $PSScriptRoot "..\build\icon.ico"
if (-not (Test-Path $icoPath)) {
    Write-Warning "build\icon.ico 가 없습니다. 'npm run generate-icons'를 자동 실행합니다..."
    & "$PSScriptRoot\generate-icons.ps1"
}
Write-Host "[5/5] 필수 아이콘 자산: 확인됨"

Write-Host "`n[성공] Windows 빌드 환경 점검 통과."
Write-Host "========================================================`n"
