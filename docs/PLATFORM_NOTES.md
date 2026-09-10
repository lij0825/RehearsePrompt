# RehearsePrompt - 플랫폼별 특이사항 및 런타임 가이드 (Platform Notes)

> 문서 버전: 1.0.0  
> 최종 수정일: 2026-09-10  
> 상태: 초기 설계 승인 대기

---

## 1. 지원 운영체제 및 최소 사양

| 플랫폼 | 지원 최소 버전 | 권장 환경 | 아키텍처 |
|---|---|---|---|
| **Windows** | Windows 10 (버전 1809 이상) | Windows 11 (버전 23H2 이상) | x64 (64-bit) |
| **macOS** | macOS 12.0 (Monterey 이상) | macOS 14.0 (Sonoma 이상) | Apple Silicon (arm64), Intel (x64) |

---

## 2. Windows 10 / 11 세부 플랫폼 구현 노트

### 2.1 고해상도 DPI 스케일링 및 폰트 렌더링
- Windows 환경에서는 디스플레이 설정에 따라 DPI 배율이 100%, 125%, 150%, 200% 등으로 다양하게 적용됩니다.
- Electron 메인 프로세스에서 `app.commandLine.appendSwitch('high-dpi-support', '1')` 및 `force-device-scale-factor` 플래그를 정규화하여 텔레프롬프터 글자가 번지거나 깨지지 않도록 DirectWrite 안티앨리어싱을 보장합니다.

### 2.2 글로벌 단축키 (Global Shortcuts)
- Electron의 `globalShortcut` 모듈에서 `CommandOrControl` 키워드는 Windows에서 `Ctrl` 키에 자동 매핑됩니다.
- Windows의 시스템 예약 단축키(예: `Ctrl+Alt+Del`, `Win+L`, `Win+Tab`)와의 충돌을 피하기 위해 `Ctrl+Shift+Space`, `Ctrl+Shift+[` 등을 기본값으로 채택했습니다.

### 2.3 마이크 및 카메라 권한
- Windows 10/11에서는 OS 차원의 마이크/카메라 차단 스위치가 존재합니다.
- 사용자가 "Windows 설정 -> 개인 정보 및 보안 -> 마이크/카메라 -> 데스크톱 앱의 마이크 액세스 허용"을 끈 경우, 앱은 에러를 감지하고 "Windows 설정에서 마이크 액세스를 켜주세요"라는 구체적인 안내를 제공합니다.

### 2.4 SmartScreen 및 Windows Defender
- 코드 서명 인증서(EV/OV Code Signing Certificate)가 없는 개발 빌드는 최초 실행 시 SmartScreen 경고("인식할 수 없는 앱")가 발생할 수 있습니다.
- 이는 "추가 정보 -> 실행"을 통해 정상 실행되며, README 및 설치 문서에 명확히 기재합니다.

### 2.5 화면 공유 투명성 보증 (Windows)
- Windows API인 `SetWindowDisplayAffinity(hwnd, WDA_EXCLUDEFROMCAPTURE)` 또는 `WDA_MONITOR`를 **절대 호출하지 않습니다**.
- OBS Studio, Zoom, Teams, Google Meet 등에서 화면이나 전체 창을 공유할 때 프롬프터 창이 투명하게 숨겨지지 않고 있는 그대로 노출됩니다.

---

## 3. macOS (Apple Silicon / Intel) 세부 플랫폼 구현 노트

### 3.1 권한 관리 (TCC - Transparency, Consent, and Control)
- macOS에서는 마이크 및 카메라 접근 시 `Info.plist`에 다음 설명 문자열이 반드시 포함되어야 합니다:
  - `NSMicrophoneUsageDescription`: "모의 면접 연습 시 음성 인식으로 대본을 자동 스크롤하기 위해 마이크 권한이 필요해요."
  - `NSCameraUsageDescription`: "면접 시선 처리 및 아이콘택트 훈련용 미리보기를 위해 카메라 권한이 필요해요."
- 사용자가 거부했을 경우 macOS 시스템 설정("시스템 설정 -> 개인정보 보호 및 보안 -> 마이크")으로 연결할 수 있는 버튼을 제공합니다.

### 3.2 글로벌 단축키 및 접근성 권한
- `CommandOrControl` 키워드는 macOS에서 `Command (⌘)` 키에 매핑됩니다.
- 백그라운드 단축키 등록 시 손쉬운 사용(Accessibility) 권한이 요구될 수 있으며, 권한 부족 시 로컬 인앱 단축키로 안전하게 폴백합니다.

### 3.3 화면 공유 투명성 보증 (macOS)
- macOS Cocoa API인 `NSWindow.sharingType = .none` 속성을 **절대 설정하지 않습니다**.
- macOS의 화면 캡처 및 화면 공유 시 프롬프터 창이 일반 윈도우와 동일하게 캡처 영역에 포함됩니다.

### 3.4 Gatekeeper 안내 (미서명 빌드)
- Apple 공증(Notarization)이 없는 개발자 배포본의 경우 "악성 코드가 있는지 확인할 수 없기 때문에 열 수 없습니다" 경고가 발생합니다.
- 터미널에서 `xattr -cr /Applications/RehearsePrompt.app` 명령어를 입력하거나 "시스템 설정 -> 개인정보 보호 및 보안 -> 확인 없이 열기"를 통해 실행할 수 있음을 문서화합니다.
