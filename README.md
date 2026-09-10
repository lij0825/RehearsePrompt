# RehearsePrompt (리허스 프롬프트)

> **당당한 시선 처리와 유연한 답변을 완성하는 모의 면접 및 발표 연습용 크로스 플랫폼 텔레프롬프터**

RehearsePrompt는 취업 면접, 기술 발표, 영상 촬영, 자기소개 및 프로젝트 발표를 준비하는 모든 분들을 위한 데스크톱(Windows / macOS) 텔레프롬프터 애플리케이션입니다. 

카메라 렌즈 라인에 맞춘 **시선 유도 기준선(Eye-Contact Guide)**과 마이크를 통해 실시간으로 말하는 위치를 추적하는 **음성 연동 자동 스크롤**을 통해, 대본을 읽는 어색함 없이 면접관을 똑바로 바라보며 자신감 넘치게 말하는 훈련을 지원합니다.

---

## ⚖️ 윤리적 사용 원칙 및 목적 제한 (Ethical Manifesto)

RehearsePrompt는 자신의 스피치 역량을 사전에 충실히 다지기 위한 **자율 훈련 및 연습 전용 도구**입니다.
시험이나 평가 시스템을 기만하거나 면접 규정을 우회하는 변칙적 사용을 엄격히 방지하기 위해 다음 기능은 **설계 단계부터 완전히 배제**되어 있습니다:

- ❌ **화면 공유 및 캡처 숨김 기능 부재**: Windows `SetWindowDisplayAffinity`나 macOS `NSWindow.sharingType` 등의 캡처 제외 API를 절대 사용하지 않습니다. Zoom, Google Meet, Teams에서 화면을 공유하면 정상적으로 투명하게 노출됩니다.
- ❌ **시험 감독 및 안티치트 우회 부재**: 온라인 시험이나 코딩 테스트 시스템의 프로세스 감시, 포커스 감지(Blur Detection)를 회피하지 않으며, 일반 OS 프로세스로 투명하게 구동됩니다.
- 🔒 **100% 로컬 프라이버시 (Zero Cloud Storage)**: 모든 작성 대본, 세션 기록, 음성 데이터는 외부 서버로 일절 전송되지 않으며 오직 사용자의 로컬 컴퓨터에만 안전하게 보관됩니다.

---

## ✨ 핵심 기능 (Key Features)

- 🎙️ **음성 인식 기반 스마트 스크롤 (Voice-Guided Scroll)**: Web Speech API와 Levenshtein + N-gram 문장 유사도 알고리즘을 결합하여, 사용자가 발화하고 있는 현재 문장을 실시간으로 자동 추적하고 하이라이트합니다.
- 🎯 **원클릭 수동 위치 보정 (Manual Fallback)**: 주변 소음이나 발음 불일치로 오인식이 발생하더라도 원하는 문장을 클릭하면 0초 만에 기준 위치가 즉시 강제 동기화됩니다.
- ⚡ **속도 기반 자동 스크롤 (WPM Constant Scroll)**: 분당 단어 수(WPM, 80~320 WPM)를 지정하여 일정한 템포로 대본을 읽는 시간 배분 훈련을 지원합니다.
- 👁️ **시선 유도 가이드라인 (Eye-Contact Line)**: 모니터 상단 웹캠 렌즈 바로 아래에 최적의 시선 기준선을 배치하여, 화면을 훑는 느낌 없이 면접관과 직접 눈을 마주치는 시각 훈련을 돕습니다.
- 📝 **강력한 로컬 대본 관리**: 1초 단위 자동 저장(Auto-save), 즐겨찾기, 대본 복제, 휴지통 복구, JSON 및 TXT 가져오기/내보내기 기능을 완벽 지원합니다.
- 🎨 **토스 디자인 시스템(TDS) 스타일**: Pretendard 폰트 ramp, Toss Blue(`#3182F6`) 포인트 컬러, 다크/라이트 테마 및 직관적인 한국어 UI를 제공합니다.
- 📦 **무설치 포터블(Portable) 지원**: 설치 권한이 없는 환경에서도 USB나 다운로드 폴더에서 즉시 실행 가능한 Portable 바이너리를 기본 제공합니다.

---

## 📥 다운로드 및 배포 바이너리 (v1.0.0)

공식 릴리스 빌드 산출물은 `release/` 폴더 또는 GitHub Releases 탭에서 다운로드할 수 있습니다.

| 운영체제 | 배포 파일 | 형식 | 파일 크기 | SHA-256 무결성 해시 |
| :--- | :--- | :--- | :--- | :--- |
| **Windows 64-bit** | [`RehearsePrompt-1.0.0-Windows-x64-setup.exe`](release/RehearsePrompt-1.0.0-Windows-x64-setup.exe) | NSIS 인스톨러 | 79.2 MB | `F593A8871EAD80B9837EB7A287284DB8CBAC54F9D2F448589743AE760692E7BE` |
| **Windows 64-bit** | [`RehearsePrompt-1.0.0-Windows-x64.msi`](release/RehearsePrompt-1.0.0-Windows-x64.msi) | MSI 엔터프라이즈 | 90.8 MB | `F3BAA369DC5E2F63389FB4E3FF5ED332787036F07E83F59513DA559B68755217` |
| **Windows 64-bit** | [`RehearsePrompt-1.0.0-Windows-x64-portable.exe`](release/RehearsePrompt-1.0.0-Windows-x64-portable.exe) | 무설치 단일 파일 | 79.0 MB | `E5B2E9A2FF25A790FD300FA05EDA198E92CA378C0E14693841637A9326A23925` |
| **macOS Apple Silicon** | `RehearsePrompt-1.0.0-macOS-arm64.dmg` | 디스크 이미지 | CI 빌드 | [GitHub Releases 참조](https://github.com/lij0825/RehearsePrompt/releases) |
| **macOS Intel** | `RehearsePrompt-1.0.0-macOS-x64.dmg` | 디스크 이미지 | CI 빌드 | [GitHub Releases 참조](https://github.com/lij0825/RehearsePrompt/releases) |

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
| 🛡️ **개인정보/권한** | [개인정보 및 권한 정책](docs/PRIVACY_AND_PERMISSIONS_KO.md) | 100% 로컬 저장 원칙, 오디오/비디오 파일 미저장 선언, 제로 텔레메트리 |
| 📢 **화면 공유 고지** | [화면 공유 투명성 안내](docs/SCREEN_SHARING_NOTICE_KO.md) | 화면 공유 감추기 없음, 노출 가능성 및 시험/면접 규정 준수 고지 |

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
공정하고 정직한 모의 연습 목적으로 누구나 자유롭게 사용, 수정, 배포할 수 있습니다.
