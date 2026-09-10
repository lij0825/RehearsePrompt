#!/usr/bin/env bash
# ==============================================================================
# RehearsePrompt macOS / Unix 빌드 환경 사전 점검기
# ==============================================================================
set -euo pipefail

echo "========================================================"
echo " [RehearsePrompt] macOS Environment Pre-Flight Check    "
echo "========================================================"

# 1. OS 및 아키텍처 확인
OS_NAME=$(uname -s)
ARCH_NAME=$(uname -m)
echo "[1/6] 운영체제: ${OS_NAME} (${ARCH_NAME})"

if [[ "${OS_NAME}" != "Darwin" ]]; then
    echo "[주의] macOS가 아닌 환경(${OS_NAME})입니다. macOS 패키징에는 macOS 호스트가 필요합니다."
fi

# 2. Node.js 확인
if ! command -v node >/dev/null 2>&1; then
    echo "[오류] Node.js가 설치되어 있지 않습니다." >&2
    exit 1
fi
NODE_VERSION=$(node --version)
echo "[2/6] Node.js 런타임: ${NODE_VERSION} (적합)"

# 3. npm 확인
if ! command -v npm >/dev/null 2>&1; then
    echo "[오류] npm이 설치되어 있지 않습니다." >&2
    exit 1
fi
NPM_VERSION=$(npm --version)
echo "[3/6] 패키지 매니저: npm ${NPM_VERSION} (적합)"

# 4. Xcode CLI 도구 확인 (macOS인 경우)
if [[ "${OS_NAME}" == "Darwin" ]]; then
    if ! command -v xcode-select >/dev/null 2>&1 || ! xcode-select -p >/dev/null 2>&1; then
        echo "[오류] Xcode Command Line Tools가 설치되어 있지 않습니다. (xcode-select --install 필요)" >&2
        exit 1
    fi
    echo "[4/6] Xcode CLI 도구: 확인됨 ($(xcode-select -p))"
else
    echo "[4/6] Xcode CLI 도구: 건너뜀 (Non-Darwin)"
fi

# 5. node_modules 확인
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="${SCRIPT_DIR}/.."
if [[ ! -d "${ROOT_DIR}/node_modules" ]]; then
    echo "[오류] node_modules 디렉터리가 없습니다. 먼저 'npm ci'를 실행하세요." >&2
    exit 1
fi
echo "[5/6] 로컬 의존성: 확인됨"

# 6. Apple ICNS 아이콘 자산 확인
if [[ ! -f "${ROOT_DIR}/build/icon.icns" ]]; then
    echo "[경고] build/icon.icns 파일이 누락되어 있습니다." >&2
else
    echo "[6/6] Apple ICNS 아이콘: 확인됨"
fi

echo -e "\n[성공] macOS 빌드 환경 사전 점검 통과."
echo "========================================================"
