#!/usr/bin/env bash
# ==============================================================================
# RehearsePrompt macOS Apple Silicon (arm64) 빌드 스크립트
# ==============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="${SCRIPT_DIR}/.."
RELEASE_DIR="${ROOT_DIR}/release"

echo "========================================================"
echo " [RehearsePrompt] Building macOS Apple Silicon (arm64)  "
echo "========================================================"

cd "${ROOT_DIR}"

# 1. 컴파일
echo "-> [Step 1/3] Compiling React Renderer & Electron Main..."
npm run build

# 2. electron-builder 패키징 (arm64 타깃)
echo -e "\n-> [Step 2/3] Packaging Apple Silicon DMG & ZIP..."
npx electron-builder --mac dmg zip --arm64

# 3. 무결성 및 결과물 검증
echo -e "\n-> [Step 3/3] Verifying arm64 Output Artifacts..."
ARM64_DMG="${RELEASE_DIR}/RehearsePrompt-1.0.0-macOS-arm64.dmg"

# 기존 명명 산출물 호환 확인
if [[ ! -f "${ARM64_DMG}" ]] && [[ -f "${RELEASE_DIR}/RehearsePrompt-1.0.0-arm64.dmg" ]]; then
    cp "${RELEASE_DIR}/RehearsePrompt-1.0.0-arm64.dmg" "${ARM64_DMG}"
fi

if [[ ! -f "${ARM64_DMG}" ]]; then
    echo "[오류] 필수 Apple Silicon DMG 파일이 생성되지 않았습니다: ${ARM64_DMG}" >&2
    exit 1
fi

SIZE_MB=$(du -m "${ARM64_DMG}" | cut -f1)
if [[ "${SIZE_MB}" -lt 10 ]]; then
    echo "[오류] 생성된 DMG 크기가 너무 작습니다 (${SIZE_MB} MB)" >&2
    exit 1
fi

HASH=$(shasum -a 256 "${ARM64_DMG}" | awk '{print $1}')
echo "   [성공] $(basename "${ARM64_DMG}") (${SIZE_MB} MB) | SHA-256: ${HASH}"

echo -e "\n=== macOS Apple Silicon (arm64) Build Succeeded ==="
echo "========================================================"
