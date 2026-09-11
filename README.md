# RehearsePrompt (리허스 프롬프트)

> **당당한 시선 처리와 유연한 답변을 완성하는 모의 면접 및 발표 연습용 크로스 플랫폼 텔레프롬프터**

RehearsePrompt는 취업 면접, 기술 발표, 영상 촬영, 자기소개 및 프로젝트 발표를 준비하는 모든 분들을 위한 데스크톱(Windows / macOS) 텔레프롬프터 애플리케이션입니다. 

카메라 렌즈 라인에 맞춘 **시선 유도 기준선(Eye-Contact Guide)**과 마이크를 통해 실시간으로 말하는 위치를 추적하는 **음성 연동 자동 스크롤**을 통해, 대본을 읽는 어색함 없이 면접관을 똑바로 바라보며 자신감 넘치게 말하는 훈련을 지원합니다.

---

## ✨ 핵심 기능 (Key Features)

- 🎙️ **음성 인식 기반 스마트 스크롤 (Voice-Guided Scroll)**: Web Speech API와 Levenshtein + N-gram 문장 유사도 알고리즘을 결합하여, 사용자가 발화하고 있는 현재 문장을 실시간으로 자동 추적하고 부드럽게 스크롤합니다.
- 💬 **웹캠 슬림 자막 모드 (Subtitle Mode)**: 대본 전체 창 대신 웹캠 바로 아래에 2줄 자막(현재 문장 및 다음 문장 미리보기)만 슬림하게 띄워, 발표 자료나 화상회의 화면을 가리지 않고 자연스러운 카메라 시선 집중을 지원합니다 (`T` 단축키).
- 🪟 **창 투명도 조절 & 반투명 오버레이 (Adjustable Opacity)**: 100%, 75%, 50%, 35% 투명도 프리셋을 제공하여 다른 발표 슬라이드나 화상회의 창 위에 겹쳐두고도 뒷배경을 편안하게 확인할 수 있습니다.
- ⚡ **속도 기반 자동 스크롤 (WPM Constant Scroll)**: 분당 단어 수(WPM, 60~240 WPM)를 지정하여 균일한 템포로 스피치 시간 배분을 훈련할 수 있습니다.
- 🎯 **원클릭 수동 위치 보정 (Manual Fallback)**: 원하는 문장을 클릭하거나 방향키(Up/Down)로 이동하면 실시간 스크롤 위치가 0초 만에 즉시 강제 동기화됩니다.
- 👁️ **카메라 시선 유도선 (Eye-Contact Line)**: 모니터 상단 35% 최적 시선 구역에 기준선을 배치하여, 대본을 훑는 어색함 없이 청중과 자연스럽게 눈을 맞추는 시각 훈련을 지원합니다.
- 📝 **강력한 로컬 대본 관리**: 자동 저장(Auto-save), 즐겨찾기, 대본 복제, 휴지통 복구, JSON 및 TXT/MD 가져오기/내보내기를 지원합니다.
- 🔒 **100% 온디바이스 로컬 프라이버시 (Zero Cloud Storage)**: 모든 작성 대본, 연습 기록, 음성 데이터는 외부 서버로 일절 전송되지 않으며 사용자 컴퓨터에만 안전하게 보관됩니다.
- 🎨 **토스 디자인 시스템(TDS) 스타일**: Pretendard 폰트 ramp, Toss Blue(`#3182F6`) 포인트 컬러, 다크/라이트 테마 및 직관적인 한국어 UI를 제공합니다.
- 📦 **무설치 포터블(Portable) 지원**: 설치 권한이 없는 환경에서도 USB나 다운로드 폴더에서 즉시 실행 가능한 Portable 바이너리를 기본 제공합니다.

---

## 📥 다운로드 및 배포 바이너리 (v1.0.0)

공식 릴리스 바이너리는 [GitHub Releases (v1.0.0)](https://github.com/lij0825/RehearsePrompt/releases/tag/v1.0.0)에서 다운로드할 수 있습니다. 아래 파일명을 클릭하면 즉시 다운로드됩니다.

| 운영체제 | 배포 파일 (클릭 시 다운로드) | 형식 | 파일 크기 | SHA-256 무결성 해시 |
| :--- | :--- | :--- | :--- | :--- |
| **Windows 64-bit** | [`RehearsePrompt-1.0.0-Windows-x64-setup.exe`](https://github.com/lij0825/RehearsePrompt/releases/download/v1.0.0/RehearsePrompt-1.0.0-Windows-x64-setup.exe) | NSIS 인스톨러 | 79.2 MB | `133f3480a6fe2dcac8f1f4847371aeb536846683ec5e0847828e2baa6594e6e4` |
| **Windows 64-bit** | [`RehearsePrompt-1.0.0-Windows-x64.msi`](https://github.com/lij0825/RehearsePrompt/releases/download/v1.0.0/RehearsePrompt-1.0.0-Windows-x64.msi) | MSI 엔터프라이즈 | 90.8 MB | `f43d2990dced0c20556702c9662020180d96d10c74edfd2ec96f7ec1e053d897` |
| **Windows 64-bit** | [`RehearsePrompt-1.0.0-Windows-x64-portable.exe`](https://github.com/lij0825/RehearsePrompt/releases/download/v1.0.0/RehearsePrompt-1.0.0-Windows-x64-portable.exe) | 무설치 단일 파일 | 79.0 MB | `dad674bca4522efe57c2486f57691d9b728298065a71103e9d29dafe96ce41ff` |
| **macOS Apple Silicon** | [`RehearsePrompt-1.0.0-macOS-arm64.dmg`](https://github.com/lij0825/RehearsePrompt/releases/download/v1.0.0/RehearsePrompt-1.0.0-macOS-arm64.dmg) | DMG 디스크 이미지 | 96.8 MB | `d0f3454e1d5c5f26b12146b8ea8d642ad2c11fd0245c1fe96220213fbfabd907` |
| **macOS Intel** | [`RehearsePrompt-1.0.0-macOS-x64.dmg`](https://github.com/lij0825/RehearsePrompt/releases/download/v1.0.0/RehearsePrompt-1.0.0-macOS-x64.dmg) | DMG 디스크 이미지 | 101.5 MB | `af77d2766e55848d27883c80df9c71aacef9df24840229a1ce2be2efbccb2672` |

> 🔒 **전체 체크섬 목록**: 변조 방지용 전체 SHA-256 목록은 [`SHA256SUMS.txt`](https://github.com/lij0825/RehearsePrompt/releases/download/v1.0.0/SHA256SUMS.txt)에서 확인 및 다운로드할 수 있습니다.

---

## 📚 기술 문서 및 사용자 가이드 (Documentation)

### 🇰🇷 일반 사용자를 위한 친절한 한국어 안내서
| 문서 구분 | 바로가기 링크 | 주요 내용 |
| :--- | :--- | :--- |
| ⚡ **빠른 시작** | [5분 빠른 시작 가이드](docs/QUICK_START_KO.md) | 첫 실행, 첫 대본 작성, 프롬프터 모드, 연습 시작 및 세션 결과 확인 |
| 📖 **사용 설명서** | [종합 사용자 설명서](docs/USER_GUIDE_KO.md) | 대본 관리, 음성 인식 스크롤, STAR 기법 연습, WPM 속도 조절, 단축키 일람 |
| 🪟 **Windows 설치** | [Windows 설치 가이드](docs/INSTALL_WINDOWS_KO.md) | 설치 프로그램/포터블/MSI 선택, SmartScreen 파란 창 대처, 마이크 권한 |
| 🍏 **macOS 설치** | [macOS 설치 가이드](docs/INSTALL_MACOS_KO.md) | Apple Silicon/Intel DMG 선택, Gatekeeper "확인되지 않은 개발자" 대처, 권한 설정 |
| 💡 **문제 해결** | [문제 해결 가이드](docs/TROUBLESHOOTING_KO.md) | 마이크 미인식, 음성 스크롤 추적 지연, 고DPI 흐림, 백신 오탐 대처법 |
| 🛡️ **개인정보/보안** | [개인정보 및 권한 정책](docs/PRIVACY_AND_PERMISSIONS_KO.md) | 100% 로컬 저장 원칙, 음성 데이터 미전송 선언, 제로 텔레메트리 |
| 🪟 **창 오버레이/활용** | [화면 공유 및 오버레이 안내](docs/SCREEN_SHARING_NOTICE_KO.md) | 일반 창 동작 방식, 투명도 오버레이 및 화상 회의 활용 안내 |

### 🛠️ 엔지니어링 및 개발자 문서 (Technical Docs)
| 구분 | 문서 링크 | 핵심 내용 |
| :--- | :--- | :--- |
| 🛠️ **개발자** | [개발자 빌드 가이드](docs/BUILD_GUIDE.md) | Node 22 환경 구축, 빌드 스크립트, 테스트 실행, 패키징 절차 |
| 🪟 **사용자** | [Windows 설치 가이드 (영문)](docs/INSTALL_WINDOWS.md) | 인스톨러/포터블/MSI 설치법, SmartScreen 경고 우회, 마이크 권한 |
| 🍏 **사용자** | [macOS 설치 가이드 (영문)](docs/INSTALL_MACOS.md) | DMG 설치법, 보안 컴플라이언스(Gatekeeper), TCC 마이크 승인 |
| 🍏 **배포** | [macOS 릴리스 가이드](docs/MACOS_RELEASE_GUIDE.md) | DMG/ZIP 아키텍처(Apple Silicon/Intel), Notarytool 공증, 22개 QA 검증 |
| 🏛️ **아키텍처** | [아키텍처 지원 전략](docs/ARCHITECTURE_STRATEGY.md) | Windows x64/ARM64, macOS 별도 파일 vs Universal, 명명 규칙 |
| 📖 **사용자** | [앱 사용 설명서 (영문)](docs/USER_GUIDE.md) | 대본 작성, WPM/음성 스크롤, 단축키 매뉴얼, 시선 유도선 활용 |
| 💡 **운영** | [문제 해결 가이드 (영문)](docs/TROUBLESHOOTING.md) | 마이크 미인식, 음성 인식 불일치, DPI 흐림, 백신 오탐 대처 |
| 🛡️ **정책** | [권한 및 개인정보 보호](docs/PRIVACY_AND_PERMISSIONS.md) | 로컬 저장 정책, 음성 데이터 미저장 선언, 캡처 투명성 규정 |
| 🔏 **보안** | [Windows 코드 서명 가이드](docs/WINDOWS_CODE_SIGNING.md) | Authenticode, EV/OV, Azure Key Vault, SmartScreen 평판 관리 |
| 🔏 **보안** | [macOS 코드 서명 및 공증](docs/MACOS_CODE_SIGNING.md) | Developer ID, Notarytool, Stapler, App Store Connect API Key |
| 🚀 **배포** | [릴리스 체크리스트](docs/RELEASE_CHECKLIST.md) | 배포 전 QA 점검표, SemVer 태깅, 코드 서명 및 공증 설정 |
| 🏗️ **설계** | [아키텍처 명세서](docs/ARCHITECTURE.md) | 메인-렌더러 프로세스 모델, IPC 보안 브리지, 상태 관리 구조 |

---

## 🚀 빠른 시작 (개발자용)

```bash
# 1. 의존성 설치
npm ci

# 2. 정적 타입 검사 및 자동화 테스트
npm run typecheck
npm test

# 3. 개발 서버 및 Electron 실행
npm run dev    # 터미널 1
npm start      # 터미널 2

# 4. Windows 설치 파일 패키징
npm run dist:win
```

---

## 🔄 CI/CD 및 자동화 파이프라인

RehearsePrompt는 GitHub Actions를 통해 지속적 통합(CI)과 자동 배포(CD)를 지원합니다:

- **CI Pipeline (`.github/workflows/ci.yml`)**: Windows 및 macOS 환경에서 푸시 및 PR 발생 시 TypeScript 타입 검사, 28개 자동화 단위/통합 테스트, 프로덕션 빌드를 매트릭스 형태로 자동 검증합니다.
- **Release Pipeline (`.github/workflows/release.yml`)**: `v*.*.*` 태그 푸시 시 운영체제별 빌드 머신(`windows-latest`, `macos-latest`)이 가동되어 Authenticode 코드 서명 및 Apple Developer ID 공증(Notarization)을 적용하고, `SHA256SUMS.txt`를 첨부하여 GitHub Release로 자동 배포합니다.

---

## 🛠️ 기술 스택 (Technology Stack)

- **Desktop Framework**: Electron 34.2 (Chromium 132, Node.js 20.18, V8)
- **Frontend Core**: React 19.0, TypeScript 5.7
- **Bundler & Build Tool**: Vite 6.1 (ESM Renderer & CommonJS Preload/Main 빌드 분리)
- **Design System**: Toss Design System (TDS) UI 원칙, Pretendard 웹폰트, Lucide Icons
- **Storage Layer**: 로컬 파일 시스템 기반 원자적(Atomic) JSON 저장소
- **Speech Engine**: Web Speech API (`SpeechRecognition`), Levenshtein Distance Token Matcher
- **Testing & Quality**: Vitest 3.0, TypeScript strict mode, PowerShell 스모크 테스트 러너

---

## 📄 라이선스 (License)

본 프로젝트는 [MIT 라이선스](LICENSE)에 따라 배포됩니다.
누구나 자유롭게 개인 스피치 연습 및 발표 준비를 위해 사용, 수정, 배포할 수 있습니다.
