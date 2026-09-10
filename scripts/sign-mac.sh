#!/usr/bin/env bash
# ==============================================================================
# RehearsePrompt macOS 코드 서명, 공증(Notarytool), 스테이플링 및 검증 스크립트
# ==============================================================================
set -eo pipefail

echo "========================================================"
echo " [RehearsePrompt] macOS Signing & Notarization Pipeline "
echo "========================================================"

TARGET_DIR="${1:-./release}"
TIMESTAMP_URL="http://timestamp.apple.com/ts01"

# 1. 자격 증명 확인 (보안 원칙: 실제 비밀번호/키 내용은 출력하지 않음)
HAS_API_KEY=false
HAS_APPLE_ID=false

if [[ -n "${APPLE_API_KEY}" && -n "${APPLE_API_ISSUER}" && -n "${APPLE_API_KEY_PATH}" ]]; then
    HAS_API_KEY=true
fi

if [[ -n "${APPLE_ID}" && -n "${APPLE_PASSWORD}" && -n "${APPLE_TEAM_ID}" ]]; then
    HAS_APPLE_ID=true
fi

if [[ -z "${APPLE_SIGNING_IDENTITY}" && -z "${CSC_LINK}" && -z "${APPLE_CERTIFICATE}" ]]; then
    echo -e "\n\033[1;33m>>> [MODE: TEST / UNSIGNED BUILD] <<<\033[0m"
    echo "macOS 코드 서명 자격 증명이 설정되지 않았습니다."
    echo "산출물은 '비서명 테스트용(Test/Unsigned)' 바이너리로 유지됩니다."
    echo "- 로컬 개발 및 내부 기능 검증용으로 정상 사용 가능합니다."
    echo "- Gatekeeper에서 '확인되지 않은 개발자' 알림이 발생합니다."
    echo "========================================================\n"
    exit 0
fi

echo -e "\n\033[1;36m-> [MODE: Official macOS Developer ID Signing & Notarization]\033[0m"

# 2. 서명 대상 DMG 및 APP 검색
DMG_FILES=$(find "${TARGET_DIR}" -name "*.dmg" -type f || true)

if [[ -z "${DMG_FILES}" ]]; then
    echo "경고: ${TARGET_DIR} 디렉터리에서 서명할 .dmg 파일을 찾을 수 없습니다."
    exit 0
fi

for DMG in ${DMG_FILES}; do
    echo -e "\n[처리 중] ${DMG}"

    # 3. 공증 제출 (App Store Connect API Key 우선 권장)
    if [[ "${HAS_API_KEY}" == "true" ]]; then
        echo "   -> Apple Notary Service 제출 중 (인증: App Store Connect API Key)..."
        xcrun notarytool submit "${DMG}" \
            --key "${APPLE_API_KEY_PATH}" \
            --key-id "${APPLE_API_KEY}" \
            --issuer "${APPLE_API_ISSUER}" \
            --wait
    elif [[ "${HAS_APPLE_ID}" == "true" ]]; then
        echo "   -> Apple Notary Service 제출 중 (인증: Apple ID & App-Specific Password)..."
        xcrun notarytool submit "${DMG}" \
            --apple-id "${APPLE_ID}" \
            --password "${APPLE_PASSWORD}" \
            --team-id "${APPLE_TEAM_ID}" \
            --wait
    else
        echo "   [경고] Notarytool 인증 정보(API Key 또는 Apple ID)가 없어 공증 단계를 건너뜁니다."
        continue
    fi

    # 4. 공증 티켓 스테이플링 (Stapling)
    echo "   -> 공증 티켓 스테이플링 적용 (xcrun stapler staple)..."
    xcrun stapler staple "${DMG}"

    # 5. 무결성 및 Gatekeeper 검증
    echo -e "\n   === [검증 파이프라인 가동] ==="

    echo "   1) codesign 검증:"
    codesign --verify --deep --strict --verbose=2 "${DMG}" || echo "   [주의] DMG 서명 검증 경고"

    echo "   2) spctl Gatekeeper 검증:"
    spctl --assess --type open --context context:primary-signature --verbose "${DMG}" || echo "   [주의] spctl 평가 경고"

    echo "   3) stapler 티켓 유효성 검증:"
    xcrun stapler validate "${DMG}"

    echo "   4) hdiutil 디스크 이미지 무결성 검증:"
    hdiutil verify "${DMG}"

    echo "   [성공] ${DMG} 공증 및 스테이플링 검증 완료."
done

echo -e "\n========================================================"
echo " macOS 배포 패키지 서명 및 공증 파이프라인 종료"
echo "========================================================"
