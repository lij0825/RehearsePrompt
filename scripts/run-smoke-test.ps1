# RehearsePrompt Smoke Test & Resource Measurement Script
# Windows PowerShell Execution Script

param (
    [int]$TimeoutSeconds = 12
)

$ErrorActionPreference = "Continue"

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host " [RehearsePrompt] Electron Smoke Test Starting    " -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

# 1. Electron 바이너리 경로 확인
$electronPath = (Resolve-Path "node_modules/electron/dist/electron.exe" -ErrorAction SilentlyContinue)
if (-not $electronPath) {
    Write-Error "Electron binary not found at node_modules/electron/dist/electron.exe"
    exit 1
}

$electronExe = $electronPath.Path
Write-Host "[1/6] Found Electron binary: $electronExe"

# 2. 프로세스 실행 설정
$startInfo = New-Object System.Diagnostics.ProcessStartInfo
$startInfo.FileName = $electronExe
$startInfo.Arguments = ". --smoke-test"
$startInfo.WorkingDirectory = (Get-Location).Path
$startInfo.UseShellExecute = $false
$startInfo.RedirectStandardOutput = $true
$startInfo.RedirectStandardError = $true

$proc = [System.Diagnostics.Process]::Start($startInfo)
$mainPid = $proc.Id
Write-Host "[2/6] Started Main Electron Process (PID: $mainPid)"

# 3. 안정화 대기 (1.5초) 후 자원 측정
Start-Sleep -Milliseconds 1500

Write-Host "[3/6] Measuring Process Tree Resources..."
$childProcs = Get-CimInstance Win32_Process | Where-Object { $_.ParentProcessId -eq $mainPid -or $_.ProcessId -eq $mainPid }

$totalWorkingSetBytes = 0
foreach ($p in $childProcs) {
    $wsMb = [math]::Round($p.WorkingSetSize / (1024 * 1024), 2)
    $totalWorkingSetBytes += $p.WorkingSetSize
    Write-Host "  -> Process PID: $($p.ProcessId) ($($p.Name)) | WorkingSet: ${wsMb} MB"
}
$totalMb = [math]::Round($totalWorkingSetBytes / (1024 * 1024), 2)
Write-Host "  -> Total Process Tree WorkingSet: ${totalMb} MB" -ForegroundColor Green

# 4. 프로세스 종료 대기 (유한 타임아웃)
Write-Host "[4/6] Waiting for graceful exit (Timeout: ${TimeoutSeconds}s)..."
$hasExited = $proc.WaitForExit($TimeoutSeconds * 1000)

$stdout = $proc.StandardOutput.ReadToEnd()
$stderr = $proc.StandardError.ReadToEnd()

if ($stdout.Trim()) {
    Write-Host "`n--- App Output ---" -ForegroundColor Gray
    Write-Host $stdout.Trim()
    Write-Host "------------------`n" -ForegroundColor Gray
}

if (-not $hasExited) {
    Write-Host "[WARN] Process did not exit within timeout. Killing main process and children..." -ForegroundColor Red
    $proc.Kill()
    $exitCode = -1
} else {
    $exitCode = $proc.ExitCode
    Write-Host "[5/6] Process exited successfully with ExitCode: $exitCode" -ForegroundColor Green
}

# 5. 잔여 프로세스 정리 검사
$remaining = Get-CimInstance Win32_Process | Where-Object { ($_.ParentProcessId -eq $mainPid -or $_.ProcessId -eq $mainPid) -and $_.Name -like "*electron*" }
if ($remaining) {
    Write-Host "[WARN] Found remaining child processes! Cleaning up..." -ForegroundColor Yellow
    foreach ($rem in $remaining) {
        Stop-Process -Id $rem.ProcessId -Force -ErrorAction SilentlyContinue
    }
} else {
    Write-Host "[6/6] Zero orphan processes detected. Process tree clean." -ForegroundColor Green
}

# 6. JSON 결과 파일 확인
$resultJsonPath = Join-Path (Get-Location).Path "smoke-test-result.json"
if (Test-Path $resultJsonPath) {
    Write-Host "`n=== Smoke Test Result JSON Found ===" -ForegroundColor Cyan
    $jsonContent = Get-Content $resultJsonPath -Raw | ConvertFrom-Json
    Write-Host "Duration: $($jsonContent.durationMs) ms"
    Write-Host "Total Memory: $($jsonContent.processTreeSummary.totalWorkingSetMb) MB"
    Write-Host "Total Processes: $($jsonContent.processTreeSummary.totalProcesses)"
    Write-Host "Exit Mode: $($jsonContent.exitMode)"
    Write-Host "Passed: $($jsonContent.passed)"
    Write-Host "====================================`n" -ForegroundColor Cyan
}

exit $exitCode
