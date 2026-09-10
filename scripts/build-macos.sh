#!/usr/bin/env bash
# ==============================================================================
# RehearsePrompt macOS 통합 릴리스 빌드 파이프라인
# ==============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="${SCRIPT_DIR}/.."

echo "########################################################"
echo " [RehearsePrompt] macOS Complete Build Pipeline        "
echo "########################################################"

cd "${ROOT_DIR}"

# 1. 환경 및 버전 검증
echo -e "\n[1/5] Running Environment & Version Verification..."
bash "${SCRIPT_DIR}/check-environment.sh"
node "${SCRIPT_DIR}/check-version.mjs"

# 2. Apple Silicon & Intel 바이너리 빌드
echo -e "\n[2/5] Building Apple Silicon (arm64) Artifacts..."
bash "${SCRIPT_DIR}/build-macos-arm64.sh"

echo -e "\n[3/5] Building Intel Mac (x64) Artifacts..."
bash "${SCRIPT_DIR}/build-macos-x64.sh"

# 3. 코드 서명 및 공증 (자격 증명 미설정 시 테스트 모드 통과)
echo -e "\n[4/5] Running Code Signing & Notarization Pipeline..."
bash "${SCRIPT_DIR}/sign-mac.sh" "${ROOT_DIR}/release"

# 4. 체크섬 생성 및 검증
echo -e "\n[5/5] Generating Checksums & Verifying Artifacts..."
node "${SCRIPT_DIR}/generate-checksums.mjs"
node "${SCRIPT_DIR}/verify-artifacts.mjs"

echo -e "\n########################################################"
echo " [성공] macOS 전체 패키지 빌드 파이프라인 완료!         "
echo "########################################################"
