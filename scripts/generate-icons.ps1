<#
.SYNOPSIS
    RehearsePrompt 멀티 플랫폼 아이콘 자동 생성기
.DESCRIPTION
    저작권 걱정 없는 자체 벡터 기반의 고품질 텔레프롬프터 아이콘을 생성합니다.
    - 투명 배경
    - 텔레프롬프터 디스플레이, 대본 라인, 시선 유도선(Eye-Contact Guide)을 상징하는 직관적 디자인
    - 16x16 ~ 1024x1024 해상도별 PNG 생성
    - Windows 멀티 해상도 .ico 생성 (16, 32, 48, 64, 128, 256)
    - macOS 공식 포맷 .icns 생성 (icp4, icp5, icp6, ic07, ic08, ic09, ic10)
#>

param (
    [string]$OutputDir = "$PSScriptRoot\..\build"
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing

Write-Host "=================================================="
Write-Host " [RehearsePrompt] Multi-Platform Icon Generator  "
Write-Host "=================================================="

$iconsDir = Join-Path $OutputDir "icons"
if (-not (Test-Path $OutputDir)) { New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null }
if (-not (Test-Path $iconsDir)) { New-Item -ItemType Directory -Path $iconsDir -Force | Out-Null }

# 둥근 사각형 경로 생성 헬퍼 함수
function Get-RoundedRectanglePath {
    param (
        [float]$x, [float]$y, [float]$width, [float]$height, [float]$radius
    )
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $diameter = $radius * 2.0
    $rect = New-Object System.Drawing.RectangleF $x, $y, $diameter, $diameter

    # Top-Left
    $path.AddArc($rect, 180, 90)
    # Top-Right
    $rect.X = $x + $width - $diameter
    $path.AddArc($rect, 270, 90)
    # Bottom-Right
    $rect.Y = $y + $height - $diameter
    $path.AddArc($rect, 0, 90)
    # Bottom-Left
    $rect.X = $x
    $path.AddArc($rect, 90, 90)

    $path.CloseFigure()
    return $path
}

# 고해상도 아이콘 렌더링 함수
function Render-IconBitmap {
    param ([int]$size)

    $bmp = New-Object System.Drawing.Bitmap $size, $size, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)

    $S = [float]$size

    # 1. 외부 라운드 섀시 (Toss Blue 그라데이션)
    $outerX = $S * 0.06
    $outerY = $S * 0.06
    $outerW = $S * 0.88
    $outerH = $S * 0.88
    $outerR = $S * 0.20
    $outerPath = Get-RoundedRectanglePath $outerX $outerY $outerW $outerH $outerR

    $gradientRect = New-Object System.Drawing.RectangleF $outerX, $outerY, $outerW, $outerH
    $colorTop = [System.Drawing.Color]::FromArgb(49, 130, 246)   # Toss Blue (#3182F6)
    $colorBottom = [System.Drawing.Color]::FromArgb(21, 93, 207) # Deep Blue (#155DCF)
    $outerBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush $gradientRect, $colorTop, $colorBottom, ([System.Drawing.Drawing2D.LinearGradientMode]::ForwardDiagonal)
    $g.FillPath($outerBrush, $outerPath)
    $outerBrush.Dispose()
    $outerPath.Dispose()

    # 2. 내부 텔레프롬프터 화면 (다크 슬레이트 디스플레이)
    $screenX = $S * 0.14
    $screenY = $S * 0.14
    $screenW = $S * 0.72
    $screenH = $S * 0.72
    $screenR = $S * 0.13
    $screenPath = Get-RoundedRectanglePath $screenX $screenY $screenW $screenH $screenR
    $screenBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(15, 23, 42)) # Slate 900 (#0F172A)
    $g.FillPath($screenBrush, $screenPath)
    $screenBrush.Dispose()
    $screenPath.Dispose()

    # 3. 상단 웹캠 렌즈 도트 (Eye-Contact 기준점)
    $camRadius = [Math]::Max(1.0, $S * 0.02)
    $camX = ($S * 0.5) - $camRadius
    $camY = ($S * 0.10) - $camRadius
    $camBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(148, 163, 184)) # Slate 400
    $g.FillEllipse($camBrush, [float]$camX, [float]$camY, [float]($camRadius * 2), [float]($camRadius * 2))
    $camBrush.Dispose()

    # 4. 시선 유도선 (Eye-Contact Cyan/Blue Guide Line)
    $guideX = $S * 0.22
    $guideY = $S * 0.28
    $guideW = $S * 0.56
    $guideH = [Math]::Max(2.0, $S * 0.055)
    $guideR = $guideH * 0.5
    $guidePath = Get-RoundedRectanglePath $guideX $guideY $guideW $guideH $guideR
    $guideBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(56, 189, 248)) # Sky Blue (#38BDF8)
    $g.FillPath($guideBrush, $guidePath)
    $guideBrush.Dispose()
    $guidePath.Dispose()

    # 5. 현재 발화 대본 라인 (화이트 강조 라인)
    $line1X = $S * 0.22
    $line1Y = $S * 0.40
    $line1W = $S * 0.46
    $line1H = [Math]::Max(2.0, $S * 0.05)
    $line1R = $line1H * 0.5
    $line1Path = Get-RoundedRectanglePath $line1X $line1Y $line1W $line1H $line1R
    $line1Brush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 255, 255)) # White
    $g.FillPath($line1Brush, $line1Path)
    $line1Brush.Dispose()
    $line1Path.Dispose()

    # 6. 다음 대본 라인 (연한 그레이)
    $line2X = $S * 0.22
    $line2Y = $S * 0.51
    $line2W = $S * 0.52
    $line2H = [Math]::Max(2.0, $S * 0.045)
    $line2R = $line2H * 0.5
    $line2Path = Get-RoundedRectanglePath $line2X $line2Y $line2W $line2H $line2R
    $line2Brush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(203, 213, 225)) # Slate 300
    $g.FillPath($line2Brush, $line2Path)
    $line2Brush.Dispose()
    $line2Path.Dispose()

    # 7. 다다음 대본 라인 (어두운 슬레이트)
    $line3X = $S * 0.22
    $line3Y = $S * 0.62
    $line3W = $S * 0.35
    $line3H = [Math]::Max(2.0, $S * 0.045)
    $line3R = $line3H * 0.5
    $line3Path = Get-RoundedRectanglePath $line3X $line3Y $line3W $line3H $line3R
    $line3Brush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(100, 116, 139)) # Slate 500
    $g.FillPath($line3Brush, $line3Path)
    $line3Brush.Dispose()
    $line3Path.Dispose()

    # 8. 마이크 음성 감지 인디케이터 (초록색 활성 펄스 도트)
    if ($size -ge 32) {
        $micDotRadius = [Math]::Max(2.0, $S * 0.035)
        $micDotX = ($S * 0.74) - $micDotRadius
        $micDotY = ($S * 0.72) - $micDotRadius
        $micBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(16, 185, 129)) # Emerald 500
        $g.FillEllipse($micBrush, [float]$micDotX, [float]$micDotY, [float]($micDotRadius * 2), [float]($micDotRadius * 2))
        $micBrush.Dispose()
    }

    $g.Dispose()
    return $bmp
}

# 1. 해상도별 PNG 생성
$sizes = @(16, 32, 48, 64, 128, 256, 512, 1024)
$pngBytesMap = @{}

Write-Host "-> Generating PNG assets at sizes: $($sizes -join ', ')..."

foreach ($s in $sizes) {
    $bmp = Render-IconBitmap $s
    $outPngPath = Join-Path $iconsDir "${s}x${s}.png"
    $ms = New-Object System.IO.MemoryStream
    $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
    $pngBytes = $ms.ToArray()
    [System.IO.File]::WriteAllBytes($outPngPath, $pngBytes)
    $pngBytesMap[$s] = $pngBytes
    $ms.Dispose()
    $bmp.Dispose()
    Write-Host "   [OK] Generated: $outPngPath"
}

# 마스터 1024x1024를 build/icon.png 로 복사
$masterPngPath = Join-Path $OutputDir "icon.png"
[System.IO.File]::WriteAllBytes($masterPngPath, $pngBytesMap[1024])
Write-Host "   [OK] Master Icon: $masterPngPath"

# 2. Windows .ico 생성 (16, 32, 48, 64, 128, 256)
Write-Host "`n-> Assembling Windows Multi-Resolution .ico container..."
$icoSizes = @(16, 32, 48, 64, 128, 256)
$icoStream = New-Object System.IO.MemoryStream
$writer = New-Object System.IO.BinaryWriter $icoStream

# ICONDIR Header (6 bytes)
$writer.Write([uint16]0) # Reserved
$writer.Write([uint16]1) # Type 1 = ICO
$writer.Write([uint16]$icoSizes.Count) # Count of images

$offset = 6 + (16 * $icoSizes.Count)

# ICONDIRENTRY (16 bytes each)
foreach ($s in $icoSizes) {
    $bytes = $pngBytesMap[$s]
    $wByte = if ($s -eq 256) { [byte]0 } else { [byte]$s }
    $hByte = if ($s -eq 256) { [byte]0 } else { [byte]$s }

    $writer.Write($wByte)          # bWidth
    $writer.Write($hByte)          # bHeight
    $writer.Write([byte]0)         # bColorCount
    $writer.Write([byte]0)         # bReserved
    $writer.Write([uint16]1)       # wPlanes
    $writer.Write([uint16]32)      # wBitCount
    $writer.Write([uint32]$bytes.Length) # dwBytesInRes
    $writer.Write([uint32]$offset)       # dwImageOffset
    $offset += $bytes.Length
}

# Image Data Payloads
foreach ($s in $icoSizes) {
    $writer.Write($pngBytesMap[$s])
}

$icoPath = Join-Path $OutputDir "icon.ico"
[System.IO.File]::WriteAllBytes($icoPath, $icoStream.ToArray())
$writer.Dispose()
$icoStream.Dispose()
Write-Host "   [OK] Created Windows Icon: $icoPath ($([math]::Round((Get-Item $icoPath).Length / 1KB, 2)) KB)"

# 3. macOS .icns 생성 (icp4, icp5, icp6, ic07, ic08, ic09, ic10)
Write-Host "`n-> Assembling Apple .icns container..."
$icnsTypeMap = [ordered]@{
    16   = "icp4" # 16x16 PNG
    32   = "icp5" # 32x32 PNG
    64   = "icp6" # 64x64 PNG
    128  = "ic07" # 128x128 PNG
    256  = "ic08" # 256x256 PNG
    512  = "ic09" # 512x512 PNG
    1024 = "ic10" # 1024x1024 PNG
}

$icnsDataStream = New-Object System.IO.MemoryStream

foreach ($pair in $icnsTypeMap.GetEnumerator()) {
    $size = $pair.Key
    $tag = $pair.Value
    $data = $pngBytesMap[$size]
    $chunkLength = 8 + $data.Length # 4 bytes tag + 4 bytes length + data

    $tagBytes = [System.Text.Encoding]::ASCII.GetBytes($tag)
    $lenBytes = [System.BitConverter]::GetBytes([uint32]$chunkLength)
    if ([System.BitConverter]::IsLittleEndian) { [Array]::Reverse($lenBytes) }

    $icnsDataStream.Write($tagBytes, 0, 4)
    $icnsDataStream.Write($lenBytes, 0, 4)
    $icnsDataStream.Write($data, 0, $data.Length)
}

$totalIcnsLength = 8 + $icnsDataStream.Length
$icnsFinalStream = New-Object System.IO.MemoryStream
$icnsWriter = New-Object System.IO.BinaryWriter $icnsFinalStream

# Header: 'icns' + Total Length (big endian)
$magicBytes = [System.Text.Encoding]::ASCII.GetBytes("icns")
$totalLenBytes = [System.BitConverter]::GetBytes([uint32]$totalIcnsLength)
if ([System.BitConverter]::IsLittleEndian) { [Array]::Reverse($totalLenBytes) }

$icnsWriter.Write($magicBytes)
$icnsWriter.Write($totalLenBytes)
$icnsWriter.Write($icnsDataStream.ToArray())

$icnsPath = Join-Path $OutputDir "icon.icns"
[System.IO.File]::WriteAllBytes($icnsPath, $icnsFinalStream.ToArray())
$icnsWriter.Dispose()
$icnsFinalStream.Dispose()
$icnsDataStream.Dispose()
Write-Host "   [OK] Created macOS Icon: $icnsPath ($([math]::Round((Get-Item $icnsPath).Length / 1KB, 2)) KB)"

Write-Host "`n=== All Icons Generated Successfully ==="
