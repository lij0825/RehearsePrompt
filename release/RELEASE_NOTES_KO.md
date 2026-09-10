# RehearsePrompt v1.0.0 공식 릴리스 노트 (Release Notes)

**RehearsePrompt** 첫 번째 공식 정식 버전(v1.0.0) 배포를 발표합니다!  
모의 면접 준비, 기술 발표 연습, 1인 영상 촬영 시 카메라를 정면으로 보며 자연스러운 시선과 속도로 말할 수 있도록 돕는 데스크톱 텔레프롬프터입니다.

---

## 1. 릴리스 패키지 및 아키텍처 지원 현황

| 파일명 | 운영체제 | 아키텍처 | 형식 | 상태 | SHA-256 체크섬 |
| :--- | :--- | :--- | :--- | :---: | :--- |
| **`RehearsePrompt-1.0.0-Windows-x64-setup.exe`** | Windows | x64 | NSIS 설치형 | **로컬 빌드 완료** | `793C9E183504584759A1FEDBDD3BB9D01C0DFD526B994C5BB42FA5192A77776B` |
| **`RehearsePrompt-1.0.0-Windows-x64.msi`** | Windows | x64 | MSI 엔터프라이즈 | **로컬 빌드 완료** | `C895BD154DEF72D9AD165C32F727DDF5F9678DAC2C50FBADEB9C6C94AE6B264A` |
| **`RehearsePrompt-1.0.0-macOS-arm64.dmg`** | macOS | arm64 (M1~M4) | DMG 디스크 이미지 | **CI에서 빌드 필요** | *GitHub Actions macos-latest 러너에서 생성* |
| **`RehearsePrompt-1.0.0-macOS-x64.dmg`** | macOS | x64 (Intel) | DMG 디스크 이미지 | **CI에서 빌드 필요** | *GitHub Actions macos-latest 러너에서 생성* |

> **⚠️ 아키텍처 지원 및 빌드 원칙 고지**:  
> - RehearsePrompt는 사용자의 혼란을 방지하기 위해 **실제 지원하지 않거나 빌드되지 않은 아키텍처 파일을 0바이트 빈 파일(가짜 파일)로 생성하지 않습니다.**  
> - 현재 작업 머신은 Windows 11 환경이므로, macOS 네이티브 도구(`hdiutil`, `codesign`, `xcrun notarytool`)가 필요한 macOS DMG 파일 2종(`arm64`, `x64`)은 저장소에 구성된 **GitHub Actions CI/CD 파이프라인(`.github/workflows/build-macos.yml`, `.github/workflows/release.yml`)**을 통해 Apple Silicon 러너에서 자동으로 컴파일, 서명 및 공증됩니다.

---

## 2. 핵심 기능 안내 (What's New)

- **음성 인식 기반 스마트 스크롤 (Speech-to-Scroll)**: 내 목소리를 실시간 감지하여 내가 읽고 있는 대본 위치로 자동 스크롤
- **원클릭 수동 위치 보정**: 발음 불일치나 소음으로 오인식되더라도 방향키나 문장 클릭으로 0초 만에 즉시 보정
- **WPM 기반 속도 제어**: 분당 단어 수(120~140 WPM 권장)에 맞춘 안정적인 페이스 훈련
- **웹캠 렌즈 시선 유도선 (Eye-Contact Guide)**: 화면을 내리깔아 보지 않고 면접관을 똑바로 바라보는 시선 교정
- **100% 로컬 데이터 저장 (Zero-Cloud)**: 외부 클라우드 전송 없이 내 PC에만 안전 보관
- **오디오/비디오 미저장**: 마이크와 카메라는 실시간 스크롤 및 거울 미리보기에만 사용되며 녹음·녹화 파일 저장 없음
- **방어적 윤리 기준 준수**: 화면 공유 몰래 숨기기, 부정행위 방지 시스템 우회 API 0건

---

## 3. 동봉된 문서 및 가이드

- [**`INSTALL_WINDOWS_KO.md`**](INSTALL_WINDOWS_KO.md): Windows 설치, SmartScreen 경고 대처, 마이크 권한
- [**`INSTALL_MACOS_KO.md`**](INSTALL_MACOS_KO.md): macOS 설치, Gatekeeper 대처, TCC 권한
- [**`USER_GUIDE_KO.md`**](USER_GUIDE_KO.md): 대본 작성, STAR 기법 연습법, 단축키 일람
- [**`TROUBLESHOOTING_KO.md`**](TROUBLESHOOTING_KO.md): 35개 주요 문제 해결 절차
- [**`PRIVACY_AND_PERMISSIONS_KO.md`**](PRIVACY_AND_PERMISSIONS_KO.md): 개인정보 및 권한 정책
- [**`SCREEN_SHARING_NOTICE_KO.md`**](SCREEN_SHARING_NOTICE_KO.md): 화면 공유 투명성 및 비우회 고지
