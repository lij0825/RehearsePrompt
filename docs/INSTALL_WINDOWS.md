# RehearsePrompt Windows 설치 및 사용 시작 가이드

본 문서는 Windows 사용자를 위한 RehearsePrompt 설치, 보안 경고(SmartScreen) 대처법, 필수 권한 설정 및 프로그램 제거 절차를 안내합니다.

---

## 1. 시스템 요구 사항 (System Requirements)

- **운영체제**: Windows 10 (64-bit) 또는 Windows 11 (64-bit)
- **프로세서**: Intel / AMD x64 호환 프로세서 (2.0 GHz 이상 권장)
- **메모리(RAM)**: 최소 4GB (권장 8GB 이상)
- **저장 공간**: 약 300MB 이상의 여유 공간
- **오디오 장치**: 마이크 입력 장치 (음성 인식 스크롤 기능 사용 시 필수)

---

## 2. 설치 파일 다운로드 및 설치 유형 선택

RehearsePrompt는 사용자의 운영 및 배포 환경에 맞춰 세 가지 형태의 Windows 배포 패키지를 제공합니다.

| 설치 유형 | 파일명 | 파일 크기 | 대상 사용자 및 특징 |
| :--- | :--- | :--- | :--- |
| **표준 설치형 (NSIS Installer)** | `RehearsePrompt-Setup-1.0.0.exe` | 83.1 MB | **일반 개인 사용자 권장**. 설치 경로 변경 가능, 바탕화면/시작메뉴 바로가기, 제어판 언인스톨러 등록 |
| **엔터프라이즈형 (MSI Package)** | `RehearsePrompt-Setup-1.0.0.msi` | 95.2 MB | **기업/교육기관 관리자 권장**. Active Directory GPO 대량 배포, Intune, SCCM 무인 자동 설치 지원 |
| **무설치형 (Portable)** | `RehearsePrompt-1.0.0-Portable.exe` | 82.8 MB | **휴대용/보안 PC 권장**. 관리자 권한 없는 환경, USB 드라이브 즉시 단일 파일 실행 |

### 2.1 표준 설치형(NSIS .exe) 설치 단계 (기본 권장)
1. `RehearsePrompt-Setup-1.0.0.exe` 파일을 더블 클릭하여 실행합니다.
2. 설치 마법사가 나타나면 설치 폴더(기본값: `%LOCALAPPDATA%\Programs\RehearsePrompt`)를 확인하고 필요 시 **[찾아보기]**를 눌러 다른 폴더(한글 및 공백 포함 경로 완벽 지원)를 지정합니다.
3. 바탕화면 바로가기 및 시작 메뉴 등록 옵션을 확인한 후 **[설치]**를 클릭합니다.
4. 설치가 완료되면 **[마침]**을 눌러 RehearsePrompt를 즉시 실행합니다.

### 2.2 기업용 MSI 패키지(MSI Package)가 필요한 경우 및 무인 설치법
MSI(Microsoft Installer) 패키지는 수십~수백 대의 PC에 소프트웨어를 원격에서 일괄 설치해야 하는 기업 전산실이나 학교 컴퓨터 실습실 환경에서 필수적입니다.
- **Active Directory GPO(그룹 정책) 배포**: 도메인 컨트롤러에서 소프트웨어 설치 정책으로 `.msi`를 등록하면 직원이 PC를 켤 때 백그라운드 자동 설치됩니다.
- **무인(Silent) 명령줄 설치**:
  ```powershell
  # 화면 프롬프트 없이 무인 자동 설치
  msiexec /i RehearsePrompt-Setup-1.0.0.msi /qn /norestart

  # 로그를 남기며 무인 설치
  msiexec /i RehearsePrompt-Setup-1.0.0.msi /qn /L*V "C:\install.log"

  # 무인 자동 제거
  msiexec /x RehearsePrompt-Setup-1.0.0.msi /qn /norestart
  ```

---

## 3. 설치 및 실행 문제 해결 가이드 (8대 원인 분류)

설치 프로그램이 실행되지 않거나 경고 창이 뜰 경우 아래 원인별 해결책을 따르세요.

### 1. 코드 서명 없음 (Unsigned) & 2. SmartScreen 평판 부족
- **원인**: 신규 소프트웨어 배포 초기이거나 비영리 오픈소스로서 유료 Authenticode 인증서가 미적용된 경우 Microsoft 평판 DB 미등록으로 인해 발생.
- **해결책**:
  1. 파란색 "Windows의 PC 보호" 창에서 좌측 상단의 **[추가 정보]** 링크를 클릭합니다.
  2. 우측 하단에 새롭게 활성화되는 **[실행]** 버튼을 클릭하여 설치를 계속합니다.

### 3. 백신 오탐 (False Positive - Defender, V3, 알약 등)
- **원인**: 패키징된 바이너리의 압축 알고리즘(Asar, Elevate 도구)에 대한 백신 휴리스틱 엔진의 오진.
- **해결책**:
  - 다운로드한 파일의 SHA-256 해시를 공식 `SHA256SUMS.txt`와 비교하여 변조되지 않았음을 확인합니다.
  - 백신의 실시간 감시 예외 폴더에 RehearsePrompt 설치 경로를 등록합니다.

### 4. WebView2 런타임 관련 문제 (완전 면제)
- **특징**: RehearsePrompt는 독립된 최신 **Chromium 132 런타임을 자체 내장**하고 있으므로, Windows OS에 WebView2 런타임이 없거나 구버전이더라도 **100% 정상 작동**하며 추가 런타임 설치가 일절 필요 없습니다.

### 5. 사용자 권한 문제 (UAC / 제한된 계정)
- **특징**: 기본 설치 프로그램은 `perMachine: false`로 설계되어 관리자(Admin) 권한이 없는 일반 표준 사용자 계정에서도 UAC 암호 요구 없이 `%LOCALAPPDATA%`에 안전하게 설치됩니다.

### 6. 설치 경로 문제 (한글 사용자 계정 및 공백)
- **특징**: `C:\Users\이인준\테스트 폴더 with space`와 같이 계정명에 한글이 들어가거나 공백이 포함된 경로에서도 파일 I/O 및 실행이 정상 동작하도록 검증되었습니다.

### 7. NSIS 설정 문제
- **특징**: 64비트 전용 바이너리(x64)로 패키징되어 32비트 전용 Windows에서는 구동되지 않습니다. Windows 10/11 64비트 OS인지 확인해 주세요.

### 8. MSI 권한 및 충돌 문제
- **특징**: MSI 설치 시 이전 버전이 남아 충돌할 경우 `msiexec /x {ProductCode}` 또는 제어판에서 기존 버전을 제거 후 설치하거나 `/fa` 옵션으로 복구 설치를 수행합니다.

---

## 4. Windows 마이크 권한 확인 및 설정

RehearsePrompt의 핵심 기능인 **음성 인식 기반 자동 스크롤**을 사용하려면 Windows의 데스크톱 앱 마이크 접근 권한이 허용되어 있어야 합니다.

1. 키보드의 `Windows Key + I`를 눌러 **[설정]**을 엽니다.
2. **[개인 정보 및 보안]** > **[마이크]** 메뉴로 이동합니다.
3. 다음 두 가지 항목이 **[켬(On)]**으로 설정되어 있는지 확인합니다:
   - **마이크 액세스**: `켬`
   - **데스크톱 앱이 마이크에 액세스하도록 허용**: `켬`
4. RehearsePrompt 앱을 처음 켤 때 화면 상단에 마이크 권한 요청 팝업이 뜨면 **[허용(Allow)]**을 클릭합니다.

---

## 5. 데이터 저장 위치 및 백업 안내

사용자가 작성한 모든 대본, 연습 세션 기록, 폰트 및 투명도 설정은 다음 경로에 안전하게 보관됩니다:

```text
C:\Users\<사용자명>\AppData\Roaming\RehearsePrompt\storage\
├── scripts.json      (대본 본문 및 버전 이력)
├── sessions.json     (연습 완료 세션 기록)
└── settings.json     (스크롤 속도, WPM, 글꼴 크기 설정)
```

PC를 포맷하거나 다른 기기로 이전할 경우, 위 `storage` 폴더를 복사하거나 앱 내의 **[스크립트 내보내기 (Export)]** 기능을 이용하시면 손쉽게 백업할 수 있습니다.

---

## 6. 프로그램 제거 (Uninstallation) 및 데이터 보존 정책

- **앱 제거**: **[Windows 설정]** > **[앱]** > **[설치된 앱]**에서 **RehearsePrompt**를 찾아 **[제거]**를 클릭하면 프로그램 실행 파일과 바로가기가 완전히 삭제됩니다.
- **데이터 보존**: 앱을 제거하더라도 사용자가 작성한 대본 데이터(`%APPDATA%\RehearsePrompt`)는 실수로 유실되지 않도록 디스크에 보존됩니다. 대본까지 완전히 영구 삭제하려면 해당 폴더를 수동으로 삭제해 주세요.
