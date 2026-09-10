# RehearsePrompt 개발자 빌드 가이드 (Developer Build Guide)

본 문서는 RehearsePrompt(Windows 및 macOS 지원 모의 면접 및 발표 연습용 텔레프롬프터 데스크톱 앱)의 소스 코드를 내려받아 로컬 개발 환경을 구축하고, 단위/통합 테스트를 실행하며, 프로덕션 배포 패키지(.exe, .dmg, .zip)를 빌드하는 전체 프로세스를 안내합니다.

---

## 1. 사전 요구 사항 (Prerequisites)

| 도구 / 런타임 | 권장 버전 | 설명 |
| :--- | :--- | :--- |
| **Node.js** | 22.x LTS 이상 (v22.13.0+ 권장) | 최신 ECMAScript 표준 및 V8 엔진 기반 런타임 |
| **npm** | 10.x 이상 | Node.js 공식 패키지 매니저 |
| **Git** | 최신 버전 | 소스 코드 버전 관리 도구 |
| **운영체제** | Windows 10/11 (64-bit) 또는 macOS 12+ (Intel / Apple Silicon) | Windows에서는 Windows 패키징, macOS에서는 macOS 패키징 지원 |

> [!IMPORTANT]
> **크로스 플랫폼 빌드 제약 사항**:
> - **Windows 타깃(.exe, Portable)**: Windows 또는 macOS/Linux(Wine 환경)에서 빌드 가능합니다.
> - **macOS 타깃(.dmg, .zip, .app)**: Apple의 하드웨어 보안 정책 및 디스크 이미지 유틸리티(`hdiutil`), 공증 도구(`notarytool`)의 종속성으로 인해 **반드시 macOS 호스트 머신 또는 GitHub Actions의 macOS 러너(`macos-latest`)에서만 빌드**해야 합니다. Windows 환경에서 `npm run dist:mac`을 직접 실행하면 `Build for macOS is supported only on macOS` 오류가 발생합니다.

---

## 2. 프로젝트 내려받기 및 의존성 설치

```bash
# 1. 저장소 복제 (Clone)
git clone https://github.com/lij0825/RehearsePrompt.git
cd RehearsePrompt

# 2. 정확한 패키지 의존성 클린 설치 (Clean Install)
npm ci
```

---

## 3. 개발 모드 실행 (Development Mode)

RehearsePrompt는 빠른 UI 피드백을 제공하는 Vite 개발 서버와 Electron 메인 프로세스로 분리되어 구동됩니다.

```bash
# 1. 터미널 A: Vite 개발 서버 구동 (기본 포트: 5173)
npm run dev

# 2. 터미널 B: Electron 앱 실행
npm run start
```

---

## 4. 정적 분석 및 자동화 테스트 (Verification)

모든 코드 수정 후에는 반드시 타입 검사와 테스트 슈트를 실행하여 무결성을 검증합니다.

```bash
# 1. TypeScript 정적 타입 검사 (Renderer 및 Electron 메인/프리로드 동시 검사)
npm run typecheck

# 2. 단위/통합 자동화 테스트 슈트 실행 (Vitest)
npm test

# 3. 테스트 감시 모드 (코드 수정 시 자동 재실행)
npm run test:watch

# 4. 런타임 스모크 테스트 (Windows PowerShell)
# 앱의 실제 구동, IPC 통신, 프로세스 종료 및 CPU/메모리 풋프린트를 측정합니다.
powershell -ExecutionPolicy Bypass -File ./scripts/run-smoke-test.ps1
```

---

## 5. 프로덕션 빌드 (Production Compile)

React 19 렌더러와 Electron 메인/프리로드 스크립트를 프로덕션 번들로 컴파일합니다.

```bash
# Renderer (dist/) 및 Electron (dist-electron/) 일괄 컴파일
npm run build
```

빌드 산출물 구조:
- `dist/`: React SPA 번들 (`index.html`, 최적화된 JS 및 CSS)
- `dist-electron/main/main.cjs`: Electron 메인 프로세스 CommonJS 번들
- `dist-electron/preload/preload.cjs`: 샌드박스 IPC 통신용 프리로드 스크립트

---

## 6. 플랫폼별 설치 파일 패키징 (Packaging)

### 6.1 Windows 설치 프로그램 빌드 (Windows Host)

```bash
# NSIS 인스톨러(.exe) 및 포터블 무설치 파일 일괄 생성
npm run dist:win
```

**산출물 (`release/` 폴더)**:
- `RehearsePrompt-Setup-1.0.0.exe`: NSIS 표준 설치 마법사 (바탕화면 및 시작 메뉴 바로가기, 제어판 언인스톨러 등록 지원)
- `RehearsePrompt-1.0.0-Portable.exe`: 설치 과정 없이 즉시 실행 가능한 포터블 바이너리
- `win-unpacked/`: 패키징 압축 해제된 실행 바이너리 디렉터리 (디버깅용)

### 6.2 macOS 디스크 이미지 및 압축 파일 빌드 (macOS Host)

macOS 머신(또는 macOS CI 러너)에서 다음 명령을 실행합니다:

```bash
# DMG 및 ZIP 아카이브 일괄 생성 (arm64, x64 유니버설/듀얼 아키텍처)
npm run dist:mac
```

**산출물 (`release/` 폴더)**:
- `RehearsePrompt-1.0.0-arm64.dmg`: Apple Silicon (M1/M2/M3/M4) 전용 드래그 앤 드롭 설치 이미지
- `RehearsePrompt-1.0.0-x64.dmg`: Intel Mac 전용 설치 이미지
- `RehearsePrompt-1.0.0-arm64.zip` / `x64.zip`: 자동 업데이트 및 아카이브용 압축 파일

---

## 7. 아키텍처 디렉터리 구조

```text
RehearsePrompt/
├── .github/workflows/          # GitHub Actions CI/CD 파이프라인 (ci.yml, release.yml)
├── build/                      # 패키징 리소스 및 macOS Entitlements (entitlements.mac.plist)
├── dist/                       # Vite React 렌더러 컴파일 결과물
├── dist-electron/              # Electron 메인 및 프리로드 CJS 컴파일 결과물
├── docs/                       # 기술 문서, 설치 가이드, 배포 가이드
├── release/                    # electron-builder 최종 설치 파일 (.exe, .dmg 등)
├── scripts/                    # 스모크 테스트 및 릴리스 자동화 스크립트
├── src/
│   ├── main/                   # Electron 메인 프로세스 (main.ts, storage.ts, IPC 핸들러)
│   ├── preload/                # ContextBridge 안전 IPC 노출 (preload.ts)
│   └── renderer/               # React 19 UI (TDS 컴포넌트, 음성 인식 서비스, 텔레프롬프터 뷰)
├── tests/                      # Vitest 자동화 단위 및 통합 테스트 슈트
├── electron-builder.json       # NSIS, DMG, Portable 패키징 설정 파일
├── package.json                # 의존성 및 빌드 스크립트 명세
├── tsconfig.json               # 렌더러 TypeScript 컴파일 설정
└── tsconfig.electron.json      # 메인/프리로드 TypeScript 컴파일 설정
```
