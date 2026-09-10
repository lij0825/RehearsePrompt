<#
.SYNOPSIS
    RehearsePrompt Windows 코드 서명 자동화 스크립트
.DESCRIPTION
    Authenticode PFX 인증서 또는 Azure Key Vault를 통한 Windows 바이너리(.exe, .dll, .msi) 서명을 수행합니다.
    자격 증명이 없는 경우 빌드를 실패시키지 않고 안전하게 [TEST / UNSIGNED BUILD] 모드로 통과합니다.
    
    지원 환경변수:
    - WINDOWS_CERTIFICATE: PFX 파일 경로 또는 Base64 인코딩 문자열
    - WINDOWS_CERTIFICATE_PASSWORD: PFX 비밀번호
    - WINDOWS_TIMESTAMP_URL: RFC 3161 타임스탬프 서버 URL (기본값: http://timestamp.digicert.com)
    - AZURE_KEY_VAULT_URI: Azure Key Vault 리소스 URI
    - AZURE_CLIENT_ID: Azure App Registration 클라이언트 ID
    - AZURE_CLIENT_SECRET: Azure 서비스 주체 시크릿
    - AZURE_TENANT_ID: Azure Active Directory 테넌트 ID
    - AZURE_CERTIFICATE_NAME: Key Vault 내 인증서 이름
#>

param (
    [string]$TargetDir = "$PSScriptRoot\..\release",
    [string]$TimestampUrl = $(if ($env:WINDOWS_TIMESTAMP_URL) { $env:WINDOWS_TIMESTAMP_URL } else { "http://timestamp.digicert.com" })
)

$ErrorActionPreference = "Stop"

Write-Host "========================================================"
Write-Host " [RehearsePrompt] Windows Code Signing Automation       "
Write-Host "========================================================"

# 보안 원칙: 자격 증명 존재 여부만 boolean으로 확인하며, 실제 비밀값은 절대 콘솔에 출력하지 않음
$hasPfx = (-not [string]::IsNullOrWhiteSpace($env:WINDOWS_CERTIFICATE)) -and (-not [string]::IsNullOrWhiteSpace($env:WINDOWS_CERTIFICATE_PASSWORD))
$hasAzure = (-not [string]::IsNullOrWhiteSpace($env:AZURE_KEY_VAULT_URI)) -and (-not [string]::IsNullOrWhiteSpace($env:AZURE_CLIENT_ID)) -and (-not [string]::IsNullOrWhiteSpace($env:AZURE_CERTIFICATE_NAME))

if (-not $hasPfx -and -not $hasAzure) {
    Write-Host "`n>>> [MODE: TEST / UNSIGNED BUILD] <<<" -ForegroundColor Yellow
    Write-Host "코드 서명 환경변수가 설정되지 않았습니다."
    Write-Host "산출물은 '비서명 테스트용(Test/Unsigned)' 바이너리로 유지됩니다."
    Write-Host "- 로컬 개발 및 내부 QA 검증용으로 정상 사용 가능합니다."
    Write-Host "- 배포 시 Windows Defender SmartScreen에서 '추가 정보 -> 실행' 확인이 필요합니다."
    Write-Host "========================================================`n"
    exit 0
}

# 대상 바이너리 검색 (.exe, .dll, .msi)
$targets = Get-ChildItem -Path $TargetDir -Include *.exe, *.msi, *.dll -Recurse -File | Where-Object {
    $_.FullName -notmatch "resources" -and $_.Name -notmatch "elevate"
}

if ($targets.Count -eq 0) {
    Write-Warning "서명할 대상 바이너리를 '$TargetDir'에서 찾을 수 없습니다."
    exit 0
}

Write-Host "`n발견된 서명 대상 파일: $($targets.Count)개"

# 1. Azure Key Vault 방식 서명
if ($hasAzure) {
    Write-Host "`n-> [MODE: Azure Key Vault Code Signing]" -ForegroundColor Cyan
    $azureTool = Get-Command "AzureSignTool" -ErrorAction SilentlyContinue
    if (-not $azureTool) {
        Write-Error "AzureSignTool이 시스템에 설치되어 있지 않습니다. (dotnet tool install --global AzureSignTool 필요)"
        exit 1
    }

    foreach ($file in $targets) {
        Write-Host "   서명 진행 중: $($file.Name)..."
        & AzureSignTool sign `
            -kvu $env:AZURE_KEY_VAULT_URI `
            -kvi $env:AZURE_CLIENT_ID `
            -kvs $env:AZURE_CLIENT_SECRET `
            -kvt $env:AZURE_TENANT_ID `
            -kvc $env:AZURE_CERTIFICATE_NAME `
            -tr $TimestampUrl `
            -td sha256 `
            -v $file.FullName
        
        if ($LASTEXITCODE -ne 0) {
            Write-Error "[$($file.Name)] Azure Key Vault 서명 실패 (종료 코드: $LASTEXITCODE)"
            exit $LASTEXITCODE
        }
    }
}
# 2. 로컬 / CI PFX 방식 서명
elseif ($hasPfx) {
    Write-Host "`n-> [MODE: Authenticode PFX Code Signing]" -ForegroundColor Cyan
    
    # signtool 탐색
    $signtool = Get-Command "signtool.exe" -ErrorAction SilentlyContinue
    if (-not $signtool) {
        $signtoolPath = Get-ChildItem "C:\Program Files (x86)\Windows Kits\10\bin\*\x64\signtool.exe" -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty FullName
        if ($signtoolPath) {
            $signtool = $signtoolPath
        }
    }

    if (-not $signtool) {
        Write-Error "signtool.exe를 찾을 수 없습니다. Windows SDK가 설치되어 있는지 확인하세요."
        exit 1
    }

    # PFX 파일 경로 확인 또는 임시 파일 복원 (Base64 지원)
    $tempPfxCreated = $false
    $pfxPath = $env:WINDOWS_CERTIFICATE
    if (-not (Test-Path $pfxPath)) {
        # Base64 문자열로 간주하여 임시 파일에 기록
        $tempPfxPath = Join-Path $env:TEMP "rehearseprompt_sign_temp.pfx"
        try {
            $pfxBytes = [System.Convert]::FromBase64String($env:WINDOWS_CERTIFICATE)
            [System.IO.File]::WriteAllBytes($tempPfxPath, $pfxBytes)
            $pfxPath = $tempPfxPath
            $tempPfxCreated = $true
        } catch {
            Write-Error "WINDOWS_CERTIFICATE가 유효한 파일 경로 또는 Base64 문자열이 아닙니다."
            exit 1
        }
    }

    try {
        foreach ($file in $targets) {
            Write-Host "   서명 진행 중: $($file.Name)..."
            & $signtool sign `
                /f $pfxPath `
                /p $env:WINDOWS_CERTIFICATE_PASSWORD `
                /fd sha256 `
                /tr $TimestampUrl `
                /td sha256 `
                /v $file.FullName

            if ($LASTEXITCODE -ne 0) {
                Write-Error "[$($file.Name)] Authenticode 서명 실패 (종료 코드: $LASTEXITCODE)"
                exit $LASTEXITCODE
            }
        }
    } finally {
        # 임시 PFX 파일 즉각 파기
        if ($tempPfxCreated -and (Test-Path $tempPfxPath)) {
            Remove-Item -Force $tempPfxPath -ErrorAction SilentlyContinue
            Write-Host "   [보안] 임시 PFX 파일 안전 파기 완료."
        }
    }
}

# 서명 검증 결과 리포트 출력
Write-Host "`n=== 서명 상태 검증 리포트 ==="
$verification = foreach ($file in $targets) {
    $sig = Get-AuthenticodeSignature $file.FullName
    [PSCustomObject]@{
        TargetFile = $file.Name
        Status     = $sig.Status
        SignerCert = if ($sig.SignerCertificate) { $sig.SignerCertificate.Subject } else { "None" }
        TimeStamper= if ($sig.TimeStamperCertificate) { $sig.TimeStamperCertificate.Subject } else { "None" }
    }
}
$verification | Format-Table -AutoSize
Write-Host "========================================================"
