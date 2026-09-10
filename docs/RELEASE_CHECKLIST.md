# RehearsePrompt 릴리스 체크리스트 및 배포 가이드 (Release Checklist)

본 문서는 RehearsePrompt의 신규 버전을 빌드하고, 코드 서명 및 공증을 적용하며, GitHub Release로 안전하게 배포하기 위해 릴리스 엔지니어가 준수해야 하는 표준 절차서입니다.

---

## 1. 사전 품질 검증 체크리스트 (Pre-Flight QA)

릴리스 태그를 생성하기 전에 로컬 환경 또는 CI 파이프라인에서 다음 4가지 검증을 필수적으로 통과해야 합니다.

- [ ] **정적 타입 검사**:
  ```bash
  npm run typecheck
  ```
  *(반드시 0개의 TypeScript 컴파일 에러여야 함)*
- [ ] **자동화 테스트 슈트 실행**:
  ```bash
  npm test
  ```
  *(28개 전 테스트 통과 확인: 단위, 대본 스토리지, 음성 알고리즘, QA 통합)*
- [ ] **프로덕션 번들 컴파일 확인**:
  ```bash
  npm run build
  ```
  *(Vite 렌더러 및 Electron 메인/프리로드 번들이 정상 생성되는지 확인)*
- [ ] **멀티 플랫폼 아이콘 무결성 점검**:
  ```bash
  npm run generate-icons
  ```
  *(`build/icon.ico`, `build/icon.icns`, `build/icons/` 내 16x16~1024x1024 PNG 전수 생성 확인)*
- [ ] **런타임 스모크 테스트 및 메모리 누수 검증**:
  ```powershell
  powershell -ExecutionPolicy Bypass -File ./scripts/run-smoke-test.ps1
  ```
  *(프로세스 정상 자동 종료, 잔류 고아 프로세스 0개, 메모리 풋프린트 500MB 이하 확인)*
- [ ] **보안 및 개인정보 무결성 감사**:
  - [ ] 코드베이스 내 하드코딩된 API 키, 비밀번호, 테스트 토큰 전무
  - [ ] 화면 공유 숨김 API(`SetWindowDisplayAffinity`) 일절 부재
  - [ ] 오디오 파일 디스크 저장 로직 일절 부재

---

## 2. 버전 관리 및 태깅 (Semantic Versioning)

1. `package.json`의 버전 번호를 업데이트합니다 (예: `1.0.0` -> `1.0.1`).
2. 변경 사항을 커밋합니다:
   ```bash
   git commit -am "chore: bump version to 1.0.0"
   ```
3. Git 태그를 생성하고 원격 저장소로 푸시합니다:
   ```bash
   git tag -a v1.0.0 -m "Release v1.0.0: Official Teleprompter for Interviews"
   git push origin v1.0.0
   ```
4. 태그가 푸시되면 GitHub Actions의 `Release Build Pipeline`(`.github/workflows/release.yml`)이 자동으로 트리거됩니다.

---

## 3. 코드 서명 및 공증 아키텍처 (Code Signing & Notarization)

RehearsePrompt는 안전한 배포를 위해 운영체제별 표준 코드 서명 및 공증 환경변수를 완벽하게 지원합니다.

### 3.1 Windows 코드 서명 (Authenticode)
- **준비물**: Sectigo, DigiCert 등 공인 CA에서 발급받은 코드사인 인증서 (`.pfx`)
- **GitHub Secrets 설정**:
  - `WIN_CSC_LINK`: Base64로 인코딩된 PFX 파일 문자열 (또는 파일 다운로드 URL)
  - `WIN_CSC_KEY_PASSWORD`: PFX 인증서 비밀번호
- **동작 원리**:
  - `electron-builder`가 Windows SDK의 `signtool.exe`를 호출하여 실행 파일(`.exe`) 및 인스톨러에 디지털 서명 및 타임스탬프를 부여합니다.
  - 서명이 완료되면 Microsoft Defender SmartScreen의 "알 수 없는 게시자" 경고가 신뢰도에 따라 사라집니다.

### 3.2 macOS 코드 서명 및 Apple Notarization (공증)
- **준비물**: Apple Developer Program 계정 (Developer ID Application 인증서)
- **GitHub Secrets 설정**:
  - `MAC_CSC_LINK`: Base64로 인코딩된 개발자 ID 인증서 (`.p12`)
  - `MAC_CSC_KEY_PASSWORD`: 인증서 비밀번호
  - `APPLE_ID`: Apple ID 이메일 계정
  - `APPLE_APP_SPECIFIC_PASSWORD`: [appleid.apple.com](https://appleid.apple.com)에서 발급받은 앱 전용 암호
  - `APPLE_TEAM_ID`: Apple Developer 10자리 팀 ID
- **동작 원리**:
  - `electron-builder`가 `build/entitlements.mac.plist`의 권한(Hardened Runtime, 마이크 사용)을 반영하여 Mach-O 바이너리에 서명합니다.
  - Apple의 Notarytool API로 서명된 DMG를 전송하여 원격 공증 티켓을 발급받고 DMG에 스테이플링(`xcrun stapler staple`)합니다.

---

## 4. 서명/공증 미적용(Unsigned) 배포 시 대처 방안

오픈소스 프로젝트나 비영리 배포 시 수십만 원의 인증서 비용이 부담되는 경우, 자체 서명(Unsigned) 상태로 안전하게 배포할 수 있습니다. 이때 사용자의 불안을 해소하기 위해 릴리스 시 다음 2가지를 반드시 제공해야 합니다.

1. **무결성 체크섬 (`SHA256SUMS.txt`) 제공**:
   - 릴리스에 포함된 바이너리가 제3자에 의해 변조되지 않았음을 증명할 수 있도록 SHA-256 해시를 릴리스 본문에 공개합니다.
   ```text
   5F89E2C53FF7B0C0348A2304A774795250193BF0DE9F2490B342CB4ADF3EE287  RehearsePrompt-1.0.0-Portable.exe
   793C9E183504584759A1FEDBDD3BB9D01C0DFD526B994C5BB42FA5192A77776B  RehearsePrompt-Setup-1.0.0.exe
   ```
2. **명확한 우회 가이드 링크 제공**:
   - 릴리스 노트 상단에 [Windows SmartScreen 우회 가이드](INSTALL_WINDOWS.md) 및 [macOS Gatekeeper 우회 가이드](INSTALL_MACOS.md) 링크를 안내하여 사용자가 안심하고 설치할 수 있도록 돕습니다.

---

## 5. 배포 완료 후 검증 및 롤백 절차

1. **GitHub Releases 산출물 확인**:
   - Windows 인스톨러 (`RehearsePrompt-Setup-1.0.0.exe`)
   - Windows 포터블 (`RehearsePrompt-1.0.0-Portable.exe`)
   - macOS DMG (`RehearsePrompt-1.0.0-arm64.dmg`, `RehearsePrompt-1.0.0-x64.dmg`)
   - 체크섬 파일 (`SHA256SUMS.txt`)
2. **클린 머신 실치 테스트**: 서명 여부 및 설치 마법사 진행 확인
3. **긴급 롤백(Hotfix) 가이드**:
   - 치명적 버그 발생 시 GitHub Release에서 해당 버전을 `Pre-release`로 전환하거나 비공개 처리하고, 즉각 패치 버전(`v1.0.1`)을 발행합니다.
