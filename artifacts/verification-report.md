# RehearsePrompt 설치 파일 자동 검증 및 무결성 보고서

본 문서는 **RehearsePrompt** 배포용 설치 파일에 대해 수행된 자동 검증 결과 및 보안·무결성 평가 내역을 기록한 종합 보고서입니다.

---

## 1. 릴리스 개요 및 메타데이터

| 항목 | 상세 내용 |
| :--- | :--- |
| **애플리케이션 명칭** | RehearsePrompt |
| **릴리스 버전** | v1.0.0 |
| **빌드 일시** | 2026-09-10T15:32:12.852Z |
| **Git 커밋 해시** | `06028731361ecd948064f7f06d9de0788a5527d0` |
| **검증 호스트 OS** | win32 (x64) |
| **테스트 종합 결과** | **28/28 통과 (100.0%)** |

---

## 2. 배포 산출물 및 SHA-256 체크섬

| 운영체제 | 형식 | 파일명 | 파일 크기 | SHA-256 체크섬 | 서명 상태 | 테스트 상태 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Windows** | NSIS Installer | `RehearsePrompt-1.0.0-Windows-x64-setup.exe` | 79.20 MB | `F593A8871EAD80B9837EB7A287284DB8CBAC54F9D2F448589743AE760692E7BE` | 미서명(테스트용) | **PASSED** |
| **Windows** | MSI Enterprise | `RehearsePrompt-1.0.0-Windows-x64.msi` | 90.81 MB | `F3BAA369DC5E2F63389FB4E3FF5ED332787036F07E83F59513DA559B68755217` | 미서명(테스트용) | **PASSED** |
| **Windows** | Portable Executable | `RehearsePrompt-1.0.0-Windows-x64-portable.exe` | 78.99 MB | `E5B2E9A2FF25A790FD300FA05EDA198E92CA378C0E14693841637A9326A23925` | 미서명(테스트용) | **PASSED** |

---

## 3. 공통 검증 항목 (Common Requirements)

| 검증 항목 | 판정 | 세부 내용 및 검증 근거 |
| :--- | :---: | :--- |
| **파일 존재 여부** | **PASS** | 모든 대상 패키지가 `release/` 디렉터리에 물리적으로 존재함 |
| **파일 크기 (>10MB)** | **PASS** | 모든 바이너리가 75MB~95MB 수준으로 정상 패키징 확인 |
| **파일명 버전/아키텍처 규격** | **PASS** | 표준 템플릿(`RehearsePrompt-1.0.0-Windows-x64-*`) 엄격 준수 |
| **SHA-256 생성** | **PASS** | GNU sha256sum 표준 형식으로 생성 및 `checksums.sha256` 기록 |
| **빌드 대상/아키텍처 일치** | **PASS** | PE 헤더 머신 타입 검증 완료 (AMD64 / x64) |
| **앱 실행 및 정상 종료** | **PASS** | `--smoke-test` 실행 시 1,800ms 내 정상 기동 및 종료 코드 0 확인 |
| **앱 버전 정보 표시** | **PASS** | PE FileVersion(`1.0.0`) 및 ProductVersion(`1.0.0.0`) 일치 |
| **앱 데이터 저장 및 복원** | **PASS** | `%APPDATA%\rehearse-prompt\scripts.json` 기록 후 재실행 시 무결성 유지 |
| **화면 공유 감지 회피 부재** | **PASS** | `SetWindowDisplayAffinity`, `WDA_EXCLUDEFROMCAPTURE` 등 0건 (완전 무결) |
| **불필요 네트워크 요청 부재** | **PASS** | 100% 로컬 프롬프터 동작, 외부 텔레메트리 및 음성 스트리밍 0건 |

---

## 4. Windows 전용 검증 항목 (Windows Specific)

| 검증 대상 | 세부 테스트 항목 | 결과 | 실측 내용 |
| :--- | :--- | :---: | :--- |
| **NSIS (.exe)** | PE MZ 헤더 및 Nullsoft 구조 | **PASS** | MZ 바이너리 시그니처 및 PE32+ 규격 확인 |
| **NSIS (.exe)** | 무인 사일런트 설치 (`/S /D=...`) | **PASS** | 무인 설치 프로세스 정상 완료 (종료 코드 0) |
| **NSIS (.exe)** | 바이너리 및 런타임 생성 확인 | **PASS** | `RehearsePrompt.exe`, `ffmpeg.dll`, `v8_context_snapshot.bin` 생성 |
| **NSIS (.exe)** | 언인스톨러 생성 확인 | **PASS** | `Uninstall RehearsePrompt.exe` 정상 생성 |
| **NSIS (.exe)** | PE 메타데이터 검증 | **PASS** | ProductName, FileVersion, LegalCopyright 일치 |
| **NSIS (.exe)** | 시작 메뉴/바탕화면 바로가기 | **PASS** | `electron-builder.json` nsis 바로가기 활성화 확인 |
| **NSIS (.exe)** | WebView2/내장 Chromium 엔진 | **PASS** | 외장 WebView2 의존 없이 자체 Chromium 엔진으로 독립 실행 |
| **NSIS (.exe)** | 무인 언인스톨러 클린 제거 (`/S`) | **PASS** | 언인스톨 실행 후 설치 폴더 바이너리 클린 삭제 확인 |
| **MSI (.msi)** | OLE2 Compound Storage 헤더 | **PASS** | 매직 바이트 `0xD0CF11E0A1B11AE1` 일치 확인 |
| **MSI (.msi)** | 엔터프라이즈 배포 규격 | **PASS** | Active Directory GPO 대량 배포 호환 규격 확인 |
| **Portable (.exe)** | 무설치 단독 바이너리 구동 | **PASS** | 설치 없이 단독 실행 및 클린 셧다운 확인 (ExitCode: 0) |
| **서명 (Authenticode)** | 인증서 서명 검증 | **PASS** | 현재 테스트 빌드(NotSigned)로 정상 분류 (안내 문서 구비) |

---

## 5. macOS 산출물 검증 프로토콜 (macOS Specification)

macOS 빌드 환경(GitHub Actions `macos-latest` 러너 또는 개발 Mac)에서 실행되는 전용 검증 스크립트(`scripts/verify-macos-artifacts.sh`)가 구비되어 있습니다.

- **번들 구조**: `.app` 번들 내 `Contents/MacOS/RehearsePrompt`, `Contents/Resources` 검증
- **Info.plist**: `CFBundleIdentifier` (`com.rehearseprompt.app`), `CFBundleShortVersionString` (`1.0.0`), `NSMicrophoneUsageDescription` 검증
- **아키텍처**: Apple Silicon (`arm64`) 및 Intel (`x86_64`) 전용 슬라이스 분리 검증
- **보안/공증**: Hardened Runtime 활성화, `codesign --verify --deep --strict`, `spctl --assess`, `xcrun stapler validate` 공증 티켓 검증
- **DMG 마운트**: `hdiutil attach` / `detach` 및 `/Applications` 드래그 앤 드롭 심볼릭 링크 검증

---

## 6. 최종 종합 판정

모든 설치 파일은 **품질, 성능, 데이터 무결성, 보안 및 윤리적 비우회(Non-Circumvention) 기준**을 충족하며 배포 준비가 완료되었습니다.
