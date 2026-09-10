#!/usr/bin/env bash
# ==============================================================================
# RehearsePrompt macOS Universal Binary (FAT) 빌드 스크립트
# ==============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="${SCRIPT_DIR}/.."
RELEASE_DIR="${ROOT_DIR}/release"

echo "========================================================"
echo " [RehearsePrompt] Building macOS Universal Binary       "
echo "========================================================"

cd "${ROOT_DIR}"

echo "[안내] Universal Binary는 arm64 및 x64 바이너리를 lipo로 병합하여 파일 용량이 2배로 증가합니다."

# 1. 컴파일
echo "-> [Step 1/3] Compiling React Renderer & Electron Main..."
npm run build

# 2. electron-builder 패키징 (universal 타깃)
echo -e "\n-> [Step 2/3] Packaging Universal DMG..."
npx electron-builder --mac dmg --universal

# 3. 무결성 및 결과물 검증
echo -e "\n-> [Step 3/3] Verifying Universal Output Artifact..."
UNIV_DMG="${RELEASE_DIR}/RehearsePrompt-1.0.0-macOS-universal.dmg"

if [[ ! -f "${UNIV_DMG}" ]] && [[ -f "${RELEASE_DIR}/RehearsePrompt-1.0.0-universal.dmg" ]]; then
    cp "${RELEASE_DIR}/RehearsePrompt-1.0.0-universal.dmg" "${UNIV_DMG}"
fi

if [[ ! -f "${UNIV_DMG}" ]]; then
    echo "[오류] 필수 Universal DMG 파일이 생성되지 않았습니다: ${UNIV_DMG}" >&2
    exit 1
fi

SIZE_MB=$(du -m "${UNIV_DMG}" | cut -f1)
HASH=$(shasum -a 256 "${UNIV_DMG}" | awk '{print $1}')
echo "   [성공] $(basename "${UNIV_DMG}") (${SIZE_MB} MB) | SHA-256: ${HASH}"

echo -e "\n=== macOS Universal Binary Build Succeeded ==="
echo "========================================================"
