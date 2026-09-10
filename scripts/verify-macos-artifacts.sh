#!/usr/bin/env bash
# ==============================================================================
# RehearsePrompt macOS 산출물 (.app 및 .dmg) 자동 검증 스크립트
# ==============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
RELEASE_DIR="${ROOT_DIR}/release"
ARTIFACTS_DIR="${ROOT_DIR}/artifacts"

mkdir -p "${ARTIFACTS_DIR}"

echo "========================================================"
echo " [RehearsePrompt] macOS Artifacts Verification Suite    "
echo "========================================================"

RESULTS_JSON="${ARTIFACTS_DIR}/macos-raw-results.json"
echo "[]" > "${RESULTS_JSON}"

record_result() {
    local category="$1"
    local name="$2"
    local passed="$3"
    local details="$4"
    
    local status="[PASS]"
    if [ "$passed" != "true" ]; then
        status="[FAIL]"
    fi
    echo "${status} [${category}] ${name} - ${details}"
    
    node -e "
        const fs = require('fs');
        const file = process.argv[1];
        const list = JSON.parse(fs.readFileSync(file, 'utf8'));
        list.push({
            Category: process.argv[2],
            Name: process.argv[3],
            Passed: process.argv[4] === 'true',
            Details: process.argv[5],
            Timestamp: new Date().toISOString()
        });
        fs.writeFileSync(file, JSON.stringify(list, null, 2), 'utf8');
    " "${RESULTS_JSON}" "${category}" "${name}" "${passed}" "${details}"
}

# 1. 대상 DMG 파일 탐색 (arm64, x64 또는 macos-arm64/x64)
DMG_ARM64=$(find "${RELEASE_DIR}" -maxdepth 1 -name "*arm64.dmg" -o -name "*Apple-Silicon.dmg" | head -n 1 || true)
DMG_X64=$(find "${RELEASE_DIR}" -maxdepth 1 -name "*x64.dmg" -o -name "*Intel.dmg" | head -n 1 || true)

TARGET_DMG="${DMG_ARM64:-${DMG_X64:-}}"

if [ -z "${TARGET_DMG}" ]; then
    echo "[안내] 로컬 환경에 생성된 macOS DMG 파일이 없습니다 (CI 환경 또는 Mac 빌드 머신에서 실행 권장)."
    record_result "macOS" "DMG 파일 존재 여부" "false" "release/ 디렉터리에 .dmg 산출물이 없습니다."
    exit 0
fi

record_result "macOS" "DMG 파일 탐색" "true" "대상 파일: $(basename "${TARGET_DMG}")"

# 파일 크기 검증
DMG_SIZE=$(wc -c < "${TARGET_DMG}" | tr -d ' ')
if [ "${DMG_SIZE}" -gt 10485760 ]; then
    record_result "macOS" "DMG 파일 크기 검증" "true" "$((DMG_SIZE / 1024 / 1024)) MB"
else
    record_result "macOS" "DMG 파일 크기 검증" "false" "10MB 이하: ${DMG_SIZE} bytes"
fi

# DMG 마운트 검증
MOUNT_POINT="/Volumes/RehearsePrompt-Verify-$$"
mkdir -p "${MOUNT_POINT}"
echo "-> DMG 마운트 시도..."
hdiutil attach "${TARGET_DMG}" -mountpoint "${MOUNT_POINT}" -nobrowse -quiet
record_result "macOS" "DMG 마운트 (hdiutil attach)" "true" "마운트 경로: ${MOUNT_POINT}"

APP_BUNDLE="${MOUNT_POINT}/RehearsePrompt.app"

# .app 존재 검증
if [ -d "${APP_BUNDLE}" ]; then
    record_result "macOS" ".app 애플리케이션 번들 존재" "true" "${APP_BUNDLE}"
else
    record_result "macOS" ".app 애플리케이션 번들 존재" "false" "번들 디렉터리 없음"
    hdiutil detach "${MOUNT_POINT}" -quiet || true
    exit 1
fi

# Applications 심볼릭 링크 검증
if [ -L "${MOUNT_POINT}/Applications" ]; then
    record_result "macOS" "Applications 드래그앤드롭 링크" "true" "심볼릭 링크 정상 확인"
else
    record_result "macOS" "Applications 드래그앤드롭 링크" "false" "Applications 링크 없음"
fi

# Info.plist 및 Bundle ID 검증
PLIST="${APP_BUNDLE}/Contents/Info.plist"
if [ -f "${PLIST}" ]; then
    BUNDLE_ID=$(defaults read "${PLIST}" CFBundleIdentifier || true)
    BUNDLE_VER=$(defaults read "${PLIST}" CFBundleShortVersionString || true)
    MIC_USAGE=$(defaults read "${PLIST}" NSMicrophoneUsageDescription || true)
    
    record_result "macOS" "Info.plist 파일 존재" "true" "Contents/Info.plist"
    record_result "macOS" "Bundle ID 검증" "$([ "${BUNDLE_ID}" = "com.rehearseprompt.app" ] && echo true || echo false)" "ID: ${BUNDLE_ID}"
    record_result "macOS" "Bundle 버전 검증" "$([ "${BUNDLE_VER}" = "1.0.0" ] && echo true || echo false)" "Version: ${BUNDLE_VER}"
    record_result "macOS" "마이크 TCC 권한 설명" "$([ -n "${MIC_USAGE}" ] && echo true || echo false)" "Description: ${MIC_USAGE}"
else
    record_result "macOS" "Info.plist 파일 존재" "false" "Info.plist 없음"
fi

# CPU 아키텍처 검증 (file / lipo)
EXECUTABLE="${APP_BUNDLE}/Contents/MacOS/RehearsePrompt"
if [ -f "${EXECUTABLE}" ]; then
    ARCH_INFO=$(file "${EXECUTABLE}")
    record_result "macOS" "실행 바이너리 아키텍처" "true" "${ARCH_INFO}"
else
    record_result "macOS" "실행 바이너리 존재" "false" "Contents/MacOS/RehearsePrompt 없음"
fi

# Code Signing 검증 (codesign)
echo "-> codesign 유효성 검사..."
if codesign --verify --deep --strict --verbose=2 "${APP_BUNDLE}" 2>&1; then
    record_result "macOS" "codesign 무결성 검증" "true" "엄격 서명 검증 통과"
else
    record_result "macOS" "codesign 무결성 검증" "false" "서명 미적용 또는 유효하지 않음"
fi

# Gatekeeper (spctl) 평가
echo "-> spctl Gatekeeper 검사..."
if spctl --assess --type execute --verbose=4 "${APP_BUNDLE}" 2>&1; then
    record_result "macOS" "Gatekeeper 평가 (spctl)" "true" "외부 배포 승인 (Accepted)"
else
    record_result "macOS" "Gatekeeper 평가 (spctl)" "false" "미공증 또는 서명 확인 실패 (테스트 빌드)"
fi

# Notarization Stapler 티켓 검증
echo "-> 공증 티켓 (stapler) 검사..."
if xcrun stapler validate "${APP_BUNDLE}" 2>&1; then
    record_result "macOS" "공증 티켓 검증 (stapler)" "true" "The validate action worked!"
else
    record_result "macOS" "공증 티켓 검증 (stapler)" "false" "공증 티켓 미첨부 (Unnotarized)"
fi

# 언마운트
echo "-> DMG 언마운트 (hdiutil detach)..."
hdiutil detach "${MOUNT_POINT}" -quiet
record_result "macOS" "DMG 정상 언마운트" "true" "클린 마운트 해제 완료"

echo "========================================================"
echo " [성공] macOS 산출물 검증 스크립트 실행 완료             "
echo "========================================================"
