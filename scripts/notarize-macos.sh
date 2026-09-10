#!/usr/bin/env bash
# ==============================================================================
# RehearsePrompt macOS Notarytool 독립 공증 및 스테이플링 도구
# ==============================================================================
set -euo pipefail

TARGET_FILE="${1:-}"

if [[ -z "${TARGET_FILE}" || ! -f "${TARGET_FILE}" ]]; then
    echo "사용법: $0 <대상_DMG_또는_ZIP_경로>" >&2
    exit 1
fi

echo "========================================================"
echo " [RehearsePrompt] macOS Notarization & Staple Tool     "
echo "========================================================"
echo "대상 파일: ${TARGET_FILE}"

if [[ -n "${APPLE_API_KEY:-}" && -n "${APPLE_API_ISSUER:-}" && -n "${APPLE_API_KEY_PATH:-}" ]]; then
    echo "-> App Store Connect API Key 방식으로 Apple Notary Service 제출..."
    xcrun notarytool submit "${TARGET_FILE}" \
        --key "${APPLE_API_KEY_PATH}" \
        --key-id "${APPLE_API_KEY}" \
        --issuer "${APPLE_API_ISSUER}" \
        --wait
elif [[ -n "${APPLE_ID:-}" && -n "${APPLE_PASSWORD:-}" && -n "${APPLE_TEAM_ID:-}" ]]; then
    echo "-> Apple ID 방식으로 Apple Notary Service 제출..."
    xcrun notarytool submit "${TARGET_FILE}" \
        --apple-id "${APPLE_ID}" \
        --password "${APPLE_PASSWORD}" \
        --team-id "${APPLE_TEAM_ID}" \
        --wait
else
    echo "[오류] Notarytool 인증 환경변수(APPLE_API_KEY 또는 APPLE_ID)가 설정되지 않았습니다." >&2
    exit 1
fi

echo "-> 공증 티켓 스테이플링 (xcrun stapler staple)..."
xcrun stapler staple "${TARGET_FILE}"

echo "-> 스테이플 티켓 검증 (xcrun stapler validate)..."
xcrun stapler validate "${TARGET_FILE}"

echo -e "\n[성공] ${TARGET_FILE} 공증 및 스테이플링 완료!"
echo "========================================================"
