#!/usr/bin/env bash
# ==============================================================================
# RehearsePrompt macOS Intel (x64) 빌드 스크립트
# ==============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="${SCRIPT_DIR}/.."
RELEASE_DIR="${ROOT_DIR}/release"

echo "========================================================"
echo " [RehearsePrompt] Building macOS Intel (x64)            "
echo "========================================================"

cd "${ROOT_DIR}"

# 1. 컴파일
echo "-> [Step 1/3] Compiling React Renderer & Electron Main..."
if [[ ! -d "${ROOT_DIR}/dist" || ! -d "${ROOT_DIR}/dist-electron" ]]; then
	npm run build
else
	echo "   Application bundle already compiled. Skipping npm run build."
fi

# 2. electron-builder 패키징 (x64 타깃)
echo -e "\n-> [Step 2/3] Packaging Intel Mac DMG & ZIP..."
EXTRA_ARGS=()
if [[ -z "${CSC_LINK:-}" && -z "${APPLE_CERTIFICATE:-}" ]]; then
	export CSC_IDENTITY_AUTO_DISCOVERY=false
	EXTRA_ARGS+=("-c.mac.identity=null")
fi

npx electron-builder --mac dmg zip --x64 --publish never "${EXTRA_ARGS[@]}"

# 3. 무결성 및 결과물 검증
echo -e "\n-> [Step 3/3] Verifying x64 Output Artifacts..."
X64_DMG="${RELEASE_DIR}/RehearsePrompt-1.0.0-macOS-x64.dmg"

if [[ ! -f "${X64_DMG}" ]] && [[ -f "${RELEASE_DIR}/RehearsePrompt-1.0.0-x64.dmg" ]]; then
    cp "${RELEASE_DIR}/RehearsePrompt-1.0.0-x64.dmg" "${X64_DMG}"
fi

if [[ ! -f "${X64_DMG}" ]]; then
    echo "[오류] 필수 Intel Mac DMG 파일이 생성되지 않았습니다: ${X64_DMG}" >&2
    exit 1
fi

SIZE_MB=$(du -m "${X64_DMG}" | cut -f1)
if [[ "${SIZE_MB}" -lt 10 ]]; then
    echo "[오류] 생성된 DMG 크기가 너무 작습니다 (${SIZE_MB} MB)" >&2
    exit 1
fi

HASH=$(shasum -a 256 "${X64_DMG}" | awk '{print $1}')
echo "   [성공] $(basename "${X64_DMG}") (${SIZE_MB} MB) | SHA-256: ${HASH}"

echo -e "\n=== macOS Intel (x64) Build Succeeded ==="
echo "========================================================"
