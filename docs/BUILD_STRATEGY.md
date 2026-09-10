# RehearsePrompt 멀티 플랫폼 빌드 및 배포 전략 명세서 (Build Strategy Specification)

본 문서는 RehearsePrompt의 개발, 테스트, 로컬 배포, 서명/공증, 그리고 CI/CD 자동화 릴리스 파이프라인에 대한 8단계 빌드 전략 및 크로스 컴파일 원칙을 정의합니다.

---

## 1. 8단계 빌드 유형 요약 비교표

| 빌드 유형 | 실행 OS | 명령어 | 출력 파일 | 서명 | 공증 | 용도 |
| :--- | :--- | :--- | :--- | :---: | :---: | :--- |
| **1. 로컬 개발 빌드** | Windows / macOS / Linux | `npm run dev` + `npm start` | 메모리 HMR 번들 (디스크 미출력) | ✕ | ✕ | UI 고속 개발, HMR 렌더링, 컴포넌트 디버깅 |
| **2. 로컬 테스트 빌드** | Windows / macOS / Linux | `npm run typecheck && npm test && npm run build` | `dist/`, `dist-electron/`, 스모크 결과 JSON | ✕ | ✕ | 정적 타입 검사, 28개 자동화 테스트 및 리소스 누수 검증 |
| **3. 서명하지 않은 배포용 빌드** | Windows (Win빌드)<br>macOS (Mac빌드) | Win: `npm run dist:win`<br>Mac: `npm run dist:mac` | Win: `.exe` (Setup, Portable)<br>Mac: `.dmg`, `.zip` | ✕ | ✕ | 유료 인증서 없는 오픈소스 배포, 수동 설치 테스트 |
| **4. Windows 서명 빌드** | Windows 10/11<br>(또는 CI `windows-latest`) | `npm run dist:win`<br>(`CSC_LINK`, `CSC_KEY_PASSWORD` 주입) | 서명된 `RehearsePrompt-Setup-1.0.0.exe`, `Portable.exe` | **○** (Authenticode) | ✕ | SmartScreen 경고 없는 Windows 상용 정식 배포 |
| **5. macOS 서명 빌드** | macOS 12+<br>(또는 CI `macos-latest`) | `npm run dist:mac`<br>(`CSC_LINK`, `CSC_KEY_PASSWORD` 주입) | 서명된 `.dmg`, `.zip` | **○** (Developer ID) | ✕ | Hardened Runtime 및 TCC 마이크/카메라 권한 검증 |
| **6. macOS 공증 빌드** | macOS 12+<br>(또는 CI `macos-latest`) | `npm run dist:mac`<br>(Apple Notarytool 환경변수 주입) | 공증 및 스테이플링 완료된 `.dmg`, `.zip` | **○** (Developer ID) | **○** (Apple Notary) | Gatekeeper 경고 없는 macOS 상용 정식 배포 |
| **7. CI/CD 빌드** | GitHub Actions<br>(Win / Mac 매트릭스) | `.github/workflows/ci.yml`<br>(Push / PR 자동 트리거) | CI 빌드 캐시 및 테스트 리포트 | ✕ | ✕ | 멀티 OS 호환성 자동 회귀 방지 및 PR 품질 게이트 |
| **8. 릴리스 업로드 빌드** | GitHub Actions<br>(Git 태그 푸시) | `git push origin v1.0.0`<br>(`.github/workflows/release.yml`) | Win 인스톨러/포터블, Mac DMG/ZIP, `SHA256SUMS.txt` | 조건부 (Secret 연동 시) | 조건부 (Secret 연동 시) | GitHub Releases 페이지 최종 사용자 공식 배포 |

---

## 2. 세부 빌드 전략 명세

### 2.1 로컬 개발 빌드 (Local Development Build)
- **실행 명령어**:
  ```bash
  # 터미널 A: Vite 개발 서버 (포트 5173)
  npm run dev
  # 터미널 B: Electron 앱 실행
  npm start
  ```
- **실행 가능한 운영체제**: Windows 10/11, macOS 12+, Linux
- **필요한 도구**: Node.js 22+, npm 10+
- **생성되는 파일 및 경로**: 메모리 상 HMR 번들 (디스크에 정적 파일 미생성)
- **서명 및 공증 여부**: 서명 미적용 (✕), 공증 미적용 (✕)
- **사용자 적합성**: **부적합** (개발자 전용, 개발 툴 및 소스 환경 의존)
- **테스트 적합성**: **최적** (React 컴포넌트 실시간 수정, CSS 스타일링, 콘솔 디버깅)
- **제한사항**: Electron 패키징 상태(`app.asar`, `file://` 프로토콜)가 아니므로 실제 번들 경로 격리 및 보안 정책 테스트에는 한계가 있음

---

### 2.2 로컬 테스트 빌드 (Local Test & Verification Build)
- **실행 명령어**:
  ```bash
  npm run typecheck                                               # TypeScript 정적 타입 분석
  npm test                                                        # Vitest 28개 테스트 슈트
  npm run build                                                   # Renderer 및 Electron 번들링
  powershell -ExecutionPolicy Bypass -File ./scripts/run-smoke-test.ps1   # 런타임 스모크 테스트
  ```
- **실행 가능한 운영체제**: Windows (현재 머신), macOS, Linux (스모크 테스트는 OS별 셸 활용)
- **필요한 도구**: Node.js 22+, npm 10+, PowerShell 5.1+
- **생성되는 파일 및 경로**:
  - `dist/index.html`, `dist/assets/*` (React 프로덕션 번들)
  - `dist-electron/main/main.cjs`, `dist-electron/preload/preload.cjs` (메인/프리로드 CJS)
  - `smoke-test-result.json` (메모리/CPU/프로세스 트리 측정 결과)
- **서명 및 공증 여부**: 서명 미적용 (✕), 공증 미적용 (✕)
- **사용자 적합성**: **부적합** (설치 가능한 바이너리 형태가 아님)
- **테스트 적합성**: **최상** (대본 스토리지 원자성, 음성 유사도 알고리즘, 리소스 누수 및 정상 종료 검증)
- **제한사항**: OS 인스톨러 마법사나 바로가기 생성 동작 자체는 검증하지 않음

---

### 2.3 서명하지 않은 배포용 빌드 (Unsigned Distribution Build)
- **실행 명령어**:
  - Windows: `npm run dist:win`
  - macOS: `npm run dist:mac`
- **실행 가능한 운영체제**:
  - Windows 빌드: Windows 10/11
  - macOS 빌드: macOS 12+ (Apple `hdiutil` 도구 종속)
- **필요한 도구**: Node.js 22+, npm 10+, electron-builder
- **생성되는 파일 및 경로 (`release/`)**:
  - Windows: `RehearsePrompt-Setup-1.0.0.exe` (NSIS), `RehearsePrompt-1.0.0-Portable.exe` (포터블)
  - macOS: `RehearsePrompt-1.0.0-arm64.dmg`, `RehearsePrompt-1.0.0-x64.dmg`, `.zip`
  - 무결성 검증: `SHA256SUMS.txt`
- **서명 및 공증 여부**: 서명 미적용 (✕, Unsigned/Self-signed), 공증 미적용 (✕)
- **사용자 적합성**: **적합** (비영리/오픈소스 배포, 단 SmartScreen/Gatekeeper 우회 안내 필수)
- **테스트 적합성**: **우수** (실제 설치 마법사 동작, 파일 연결, 앱 구동 E2E 확인 가능)
- **제한사항**: 최초 실행 시 Windows Defender SmartScreen의 "Windows의 PC 보호" 경고 및 macOS Gatekeeper의 "확인되지 않은 개발자" 차단 팝업 발생

---

### 2.4 Windows 서명 빌드 (Windows Signed Build)
- **실행 명령어**:
  ```powershell
  $env:CSC_LINK = "C:\secrets\authenticode.pfx"
  $env:CSC_KEY_PASSWORD = "인증서비밀번호"
  npm run dist:win
  ```
- **실행 가능한 운영체제**: Windows 10/11 (또는 CI `windows-latest`)
- **필요한 도구**: Node.js, npm, electron-builder, Authenticode EV/OV 코드사인 인증서 (`.pfx`)
- **생성되는 파일 및 경로 (`release/`)**:
  - `RehearsePrompt-Setup-1.0.0.exe` (디지털 서명 및 타임스탬프 부여됨)
  - `RehearsePrompt-1.0.0-Portable.exe` (디지털 서명 부여됨)
- **서명 및 공증 여부**: **서명 완료 (○, Authenticode)**, 공증 해당 없음 (✕, Windows에는 Apple 공증 없음)
- **사용자 적합성**: **최상** (알 수 없는 게시자 경고 없이 신뢰성 있는 원클릭 설치 가능)
- **테스트 적합성**: **최상** (프로덕션 릴리스 최종 검증)
- **제한사항**: 고가의 상용 코드 서명 인증서(EV/OV) 발급 및 하드웨어 토큰(HSM) 또는 클라우드 키 저장소 필요

---

### 2.5 macOS 서명 빌드 (macOS Signed Build)
- **실행 명령어**:
  ```bash
  export CSC_LINK="base64-encoded-p12-or-path"
  export CSC_KEY_PASSWORD="인증서비밀번호"
  npm run dist:mac
  ```
- **실행 가능한 운영체제**: macOS 12+ (또는 CI `macos-latest`)
- **필요한 도구**: macOS 머신, Xcode Command Line Tools, Apple Developer ID Application 인증서 (`.p12`), `codesign`
- **생성되는 파일 및 경로 (`release/`)**:
  - `RehearsePrompt-1.0.0-arm64.dmg` / `x64.dmg` (Hardened Runtime 및 서명 포함)
  - `RehearsePrompt-1.0.0-arm64.zip` / `x64.zip`
- **서명 및 공증 여부**: **서명 완료 (○, Developer ID Application)**, 공증 미완료 (✕)
- **사용자 적합성**: **부분 적합** (서명은 되었으나 최신 macOS는 공증이 없으면 여전히 차단함)
- **테스트 적합성**: **우수** (Hardened Runtime 활성화 시 마이크 TCC 권한 프롬프트 및 JIT 허용 테스트용)
- **제한사항**: Apple 공증(Notarization)을 통과하지 않으면 Gatekeeper가 "악성 소프트웨어 확인 불가"로 차단

---

### 2.6 macOS 공증 빌드 (macOS Notarized & Stapled Build)
- **실행 명령어**:
  ```bash
  export CSC_LINK="base64-p12"
  export CSC_KEY_PASSWORD="인증서비밀번호"
  export APPLE_ID="developer@apple.com"
  export APPLE_APP_SPECIFIC_PASSWORD="xxxx-xxxx-xxxx-xxxx"
  export APPLE_TEAM_ID="10자리TeamID"
  npm run dist:mac
  ```
- **실행 가능한 운영체제**: macOS 12+ (또는 CI `macos-latest`)
- **필요한 도구**: macOS 머신, Apple Developer Program 계정, `notarytool`, `stapler`, electron-builder
- **생성되는 파일 및 경로 (`release/`)**:
  - `RehearsePrompt-1.0.0-arm64.dmg` (공증 티켓이 파일에 스테이플링 완료)
  - `RehearsePrompt-1.0.0-x64.dmg` (공증 티켓 스테이플링 완료)
- **서명 및 공증 여부**: **서명 완료 (○)**, **공증 완료 (○, Apple Notary Service 통과 및 Stapled)**
- **사용자 적합성**: **최상** (모든 macOS 기기에서 보안 경고 없이 즉시 마운트 및 실행 가능)
- **테스트 적합성**: **최상** (공식 macOS 최종 배포본 검증)
- **제한사항**: 연간 $99의 Apple Developer Program 유료 구독 필요, Apple 공증 서버 통신으로 인한 빌드 시간 추가 소요 (약 2~5분)

---

### 2.7 CI/CD 빌드 (Continuous Integration Pipeline Build)
- **실행 명령어**: GitHub Actions 워크플로(`.github/workflows/ci.yml`) 자동 실행
  - Step 1: `npm ci`
  - Step 2: `npm run typecheck`
  - Step 3: `npm test`
  - Step 4: `npm run build`
- **실행 가능한 운영체제**: GitHub Actions 클라우드 가상 머신 (`windows-latest`, `macos-latest` 매트릭스)
- **필요한 도구**: GitHub Actions Runner, Node.js 22, npm
- **생성되는 파일 및 경로**: CI 러너 임시 빌드 아티팩트 (`dist/`, `dist-electron/`)
- **서명 및 공증 여부**: 서명 미적용 (✕), 공증 미적용 (✕)
- **사용자 적합성**: **부적합** (내부 CI 파이프라인 전용)
- **테스트 적합성**: **최상** (Windows와 macOS 환경에서의 회귀 버그 및 빌드 파손 자동 감지)
- **제한사항**: 릴리스 바이너리를 사용자에게 공개 배포하지 않음

---

### 2.8 릴리스 업로드 빌드 (Release & Assets Publishing Build)
- **실행 명령어**:
  ```bash
  git tag -a v1.0.0 -m "Release v1.0.0"
  git push origin v1.0.0
  ```
  *(푸시 즉시 `.github/workflows/release.yml` 자동 실행)*
- **실행 가능한 운영체제**:
  - Windows 빌드: `windows-latest`
  - macOS 빌드: `macos-latest`
  - 릴리스 발행: `ubuntu-latest`
- **필요한 도구**: GitHub Actions, GitHub Secrets (인증서 및 토큰), softprops/action-gh-release
- **생성되는 파일 및 경로**:
  - `RehearsePrompt-Setup-1.0.0.exe` (Windows 인스톨러)
  - `RehearsePrompt-1.0.0-Portable.exe` (Windows 무설치 포터블)
  - `RehearsePrompt-1.0.0-arm64.dmg` (Apple Silicon Mac)
  - `RehearsePrompt-1.0.0-x64.dmg` (Intel Mac)
  - `SHA256SUMS.txt` (전체 배포 파일 해시 체크섬)
  - **배포 경로**: GitHub Repository의 `Releases` 탭 다운로드 에셋
- **서명 및 공증 여부**:
  - GitHub Secrets에 키가 등록된 경우: **서명 및 공증 완료 (○)**
  - 미등록된 경우: **무서명 빌드 생성 및 SHA-256 체크섬 첨부 (안전한 우회 가이드 제공)**
- **사용자 적합성**: **최상** (전 세계 사용자가 OS에 맞춰 내려받는 공식 릴리스)
- **테스트 적합성**: **최상** (다운로드 URL, 체크섬 일치, 실제 클린 PC 설치 E2E 검증)
- **제한사항**: 원격 저장소 푸시 권한 및 사전 정의된 시맨틱 버전 태그 필요

---

## 3. 크로스 컴파일 및 멀티 플랫폼 배포 원칙

1. **운영체제 고유 빌드 러너 사용 원칙**:
   - Windows 인스톨러 및 바이너리는 반드시 Windows 호스트 머신(현재 로컬 머신 또는 CI `windows-latest`)에서 빌드합니다.
   - macOS 바이너리(`DMG`, `APP`, `ZIP`)는 반드시 macOS 머신 또는 CI `macos-latest` 러너에서 빌드합니다.
   - Windows 호스트에서 `hdiutil`이나 macOS Mach-O 바이너리 생성을 무리하게 시도(와인 에뮬레이션 등)하지 않으며, 각 OS의 네이티브 도구 체인을 존중합니다.
2. **macOS 아키텍처 분리 전략 (Apple Silicon vs Intel)**:
   - 현재 `electron-builder.json`에 `arch: ["arm64", "x64"]`를 개별 타깃으로 설정하여 독립된 DMG를 생성합니다.
   - **이유**: Universal Binary(`universal`)의 경우 파일 크기가 2배(170MB 이상)로 급증하고, 서명/공증 및 슬라이스 추출 과정에서 호환성 오류 위험이 증가하므로, 최신 M 시리즈 사용자를 위한 경량화된 `arm64.dmg`와 구형 Intel 사용자를 위한 `x64.dmg`를 분리 제공하는 것이 다운로드 속도와 안정성 면에서 가장 우수합니다.
3. **로컬 머신 제약 극복 (CI 자동화 연동)**:
   - 현재 로컬 개발 머신이 Windows 11이므로 macOS용 패키지는 로컬에서 직접 만들 수 없습니다.
   - 이를 해결하기 위해 Git 태그 푸시 한 번으로 GitHub Actions `macos-latest` 러너가 가동되어 macOS DMG 패키징, 코드 서명, Apple Notarization, SHA-256 체크섬 생성을 100% 자동 수행하도록 파이프라인을 완전히 구축했습니다.
