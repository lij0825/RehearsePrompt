# RehearsePrompt macOS 코드 서명 및 공증(Notarization) 가이드

본 문서는 RehearsePrompt의 macOS 배포판(`.dmg`, `.app`)에 Apple Developer ID 디지털 서명을 적용하고, Apple Notary Service 공증을 거쳐 Gatekeeper 경고 없이 배포하기 위한 엔지니어링 표준 절차서입니다.

---

## 1. Apple 배포 및 서명 체계 핵심 개념

### 1.1 Apple Developer Program 필요 여부
- **로컬 개발 및 내부 테스트**: 유료 계정이 필요 없으며, 자체 서명(Ad-hoc) 또는 미서명 상태로 로컬 실행이 가능합니다.
- **공식 대외 배포 (공증 필수)**: macOS 10.15 Catalina 이후 배포되는 모든 앱은 Gatekeeper 차단을 방지하기 위해 Apple Developer Program(연간 $99)에 가입된 **Developer ID 인증서 서명 및 Apple Notary Service 공증이 필수**입니다.

### 1.2 인증서 유형 비교: Application vs Installer
- **Developer ID Application**: macOS 앱 번들(`.app`), 실행 바이너리, 내부 동적 라이브러리(`.dylib`) 서명에 사용됩니다. RehearsePrompt의 DMG 배포에 사용되는 필수 인증서입니다.
- **Developer ID Installer**: Apple 설치 패키지(`.pkg`)에 서명할 때만 사용됩니다. DMG 및 ZIP 형태로 배포하는 본 프로젝트에서는 필요하지 않습니다.

### 1.3 Team ID와 Bundle ID
- **Team ID**: Apple Developer 계정에 부여되는 고유한 10자리 영숫자 식별자입니다 (예: `ABC123XYZ0`).
- **Bundle ID**: 애플리케이션의 고유 역도메인 식별자입니다 (`com.rehearseprompt.app`).

### 1.4 Mac App Store 배포 vs 외부 공증 배포 (Notarized Direct Distribution)

| 구분 | Mac App Store 배포 | 외부 공증 배포 (RehearsePrompt 채택) |
| :--- | :--- | :--- |
| **배포 경로** | Mac App Store 앱 전용 | 웹사이트 및 GitHub Releases 직접 다운로드 |
| **심사 기간** | Apple 심사관의 수일간 기능 심사 | 자동화된 Notarytool 악성코드 정적 검사 (2~5분) |
| **샌드박스 정책** | Apple App Sandbox 의무 적용 | Hardened Runtime 및 필요 권한만 Entitlements 선언 |
| **수수료** | Apple 인앱결제 수수료 (15~30%) | 수수료 없음 (오픈소스/무료 배포 최적) |

---

## 2. 코드 서명 및 공증 파이프라인 요소 기술

```text
┌─────────────────┐     ┌─────────────────────┐     ┌─────────────────────┐
│  Mach-O Binary  │ ──▶ │  codesign           │ ──▶ │  Hardened Runtime   │
│  & App Bundle   │     │  (Developer ID App) │     │  + entitlements     │
└─────────────────┘     └─────────────────────┘     └─────────────────────┘
                                                               │
                                                               ▼
┌─────────────────┐     ┌─────────────────────┐     ┌─────────────────────┐
│  Gatekeeper     │ ◀── │  xcrun stapler      │ ◀── │  xcrun notarytool   │
│  검증 통과      │     │  (Ticket Stapling)  │     │  (Apple Cloud 검사) │
└─────────────────┘     └─────────────────────┘     └─────────────────────┘
```

1. **`codesign`**: 앱 번들과 바이너리에 Developer ID 인증서 서명을 주입합니다.
2. **Hardened Runtime (`hardenedRuntime: true`)**: JIT 인젝션, 메모리 조작, 악성 라이브러리 로드를 방어하는 강화된 커널 보안 체계입니다.
3. **Entitlements (`build/entitlements.mac.plist`)**: Hardened Runtime 내에서 허용할 최소 권한(마이크 사용 `audio-input`, JIT)을 명시합니다.
4. **`xcrun notarytool`**: 완성된 DMG를 Apple 공증 서버로 전송하여 악성코드 유무를 자동 검사합니다.
5. **`xcrun stapler`**: 공증 승인 티켓을 DMG 본체에 물리적으로 스테이플링하여 오프라인 상태에서도 Gatekeeper가 즉시 유효성을 검증할 수 있도록 만듭니다.

---

## 3. 환경변수 아키텍처 설계

RehearsePrompt는 인증서 비밀값과 키를 저장소에 절대 커밋하지 않으며, CI/CD 러너 또는 안전한 환경변수로 주입합니다.

### 3.1 App Store Connect API Key 방식 (최우선 권장)
2단계 인증(2FA) 만료 위험이 없고 CI/CD 자동화에 가장 안정적인 공식 방식입니다.

| 환경변수명 | 설명 | 예시 |
| :--- | :--- | :--- |
| `APPLE_API_KEY` | App Store Connect API Key ID (10자리) | `2X9R4HXF34` |
| `APPLE_API_ISSUER` | App Store Connect API Issuer ID (UUID) | `57246542-96fe-1a63-e053-0824d011072a` |
| `APPLE_API_KEY_PATH` | 다운로드한 `.p8` 개인키 파일 경로 | `/secrets/AuthKey_2X9R4HXF34.p8` |
| `APPLE_TEAM_ID` | Apple Developer 10자리 Team ID | `ABC123XYZ0` |
| `APPLE_CERTIFICATE` | Developer ID Application `.p12` Base64 | `MIIK...` |
| `APPLE_CERTIFICATE_PASSWORD` | `.p12` 인증서 비밀번호 | `(비밀값)` |

### 3.2 Apple ID 및 앱 전용 암호 방식 (대체 방식)
- `APPLE_ID`: 개발자 Apple ID 이메일
- `APPLE_PASSWORD` (또는 `APPLE_APP_SPECIFIC_PASSWORD`): [appleid.apple.com](https://appleid.apple.com)에서 생성한 앱 전용 암호
- `APPLE_TEAM_ID`: 10자리 Team ID

---

## 4. 로컬 및 CI 환경 검증 명령어 모음

macOS 터미널에서 다음 명령어를 통해 인증서와 빌드 산출물의 상태를 직접 검증합니다.

```bash
# 1. 설치된 코드 서명 인증서 목록 확인 (비밀값 미출력)
security find-identity -v -p codesigning

# 2. 공증 제출 이력 확인
xcrun notarytool history --key /path/to/key.p8 --key-id KEYID --issuer ISSUER_UUID

# 3. 바이너리 서명 및 Hardened Runtime 정밀 검증
codesign --verify --deep --strict --verbose=2 ./release/RehearsePrompt-1.0.0-arm64.dmg

# 4. Gatekeeper 정책 평가 검증
spctl --assess --type open --context context:primary-signature --verbose ./release/RehearsePrompt-1.0.0-arm64.dmg

# 5. 스테이플된 공증 티켓 유효성 검증
xcrun stapler validate ./release/RehearsePrompt-1.0.0-arm64.dmg

# 6. DMG 디스크 이미지 체크섬 무결성 검증
hdiutil verify ./release/RehearsePrompt-1.0.0-arm64.dmg
```

---

## 5. 개발 빌드 vs 배포 빌드 분리 정책

- **개발 빌드 (Development Build)**:
  - 목적: 빠른 로컬 UI 테스트 및 기능 디버깅
  - 특징: 미서명(Unsigned) 허용, 공증 생략, 로컬 개발 머신 전용
  - 명령어: `npm run dev` + `npm start`
- **배포 빌드 (Distribution Release Build)**:
  - 목적: 엔드유저 공식 배포
  - 특징: Developer ID Application 서명 + Hardened Runtime + Entitlements + `notarytool` 공증 + `stapler` 티켓 부착 + SHA-256 생성
  - 명령어: `git push origin v1.0.0` (GitHub Actions `release.yml` 자동 실행)

---

## 6. 공증(Notarization) 실패 시 10대 원인 점검표

공증 제출 시 오류가 발생하면 `xcrun notarytool log <submission-id>` 명령으로 로그를 조회한 후 다음 항목을 점검합니다:

1. **서명되지 않은 내부 바이너리**: 번들 내부의 `node_modules` 네이티브 애드온(`.node`) 또는 서드파티 라이브러리가 서명에서 누락된 경우
2. **잘못되거나 과도한 Entitlements**: 필요하지 않은 권한(예: 카메라, 마이크 외의 권한)이 선언된 경우 (카메라 권한 제거 완료)
3. **Info.plist 설명 문구 누락**: `NSMicrophoneUsageDescription` 문구가 누락된 경우 (`mac.extendInfo`에 주입 완료)
4. **Bundle ID 불일치**: `package.json`, `electron-builder.json`, 프로비저닝 프로파일 간 Bundle ID 불일치
5. **인증서 만료 또는 인증 체인 누락**: 개발자 인증서가 만료되었거나 Apple Worldwide Developer Relations 중간 CA 인증서가 키체인에 없는 경우
6. **Team ID 불일치**: 환경변수에 입력된 `APPLE_TEAM_ID`와 인증서의 OU 필드가 다른 경우
7. **API Key 권한 부족**: App Store Connect API Key에 'Developer' 또는 'Admin' 권한이 부여되지 않은 경우
8. **타임스탬프 누락**: 서명 시 Apple 타임스탬프 서버(`http://timestamp.apple.com/ts01`)가 응답하지 않았거나 누락된 경우
9. **로컬 개발 경로 노출**: 빌드 바이너리에 로컬 컴퓨터의 절대 경로가 디버그 심볼 형태로 노출된 경우
10. **디스크 이미지 포맷 오류**: DMG 볼륨이 올바르게 마운트되지 않거나 손상된 경우
