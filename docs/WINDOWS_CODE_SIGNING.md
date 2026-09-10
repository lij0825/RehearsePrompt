# RehearsePrompt Windows 코드 서명 가이드 및 보안 아키텍처 (Code Signing Architecture)

본 문서는 RehearsePrompt의 Windows 실행 파일(`EXE`), 라이브러리(`DLL`), 인스톨러(`NSIS`, `MSI`)에 Microsoft Authenticode 디지털 서명을 적용하기 위한 표준 아키텍처와 환경변수 설계, 그리고 인증서 부재 시의 테스트 빌드 운영 지침을 상세히 규정합니다.

---

## 1. Microsoft Authenticode 기술 개요

Microsoft Authenticode는 사용자가 인터넷에서 다운로드한 소프트웨어가 신뢰할 수 있는 개발자에 의해 제작되었으며, 다운로드 과정에서 제3자에 의해 변조(Tampering)되거나 악성코드가 삽입되지 않았음을 암호학적으로 입증하는 디지털 서명 기술입니다.

- **무결성 검증**: 실행 파일의 해시값(SHA-256)을 개발자의 개인키로 암호화하여 서명 블록에 포함시킵니다. 파일이 1비트라도 수정되면 서명이 즉시 무효화됩니다.
- **게시자 신원 보증**: 공인 인증기관(DigiCert, Sectigo 등)이 발급한 인증서를 통해 "알 수 없는 게시자" 대신 공인된 조직/개발자 이름이 표시됩니다.
- **SmartScreen 신뢰**: Microsoft Defender SmartScreen의 평판(Reputation) 엔진과 연동되어 신뢰도가 누적되면 보안 경고 창이 자동으로 사라집니다.

---

## 2. 코드 서명 인증서 유형 비교: OV vs EV

| 구분 | 일반 조직 인증서 (OV, Organization Validation) | 확장 검증 인증서 (EV, Extended Validation) |
| :--- | :--- | :--- |
| **발급 심사** | 사업자 등록증 및 도메인 소유권 확인 | 엄격한 법인 신원 조회 및 서명 권한자 전화 실사 |
| **개인키 보관** | FIPS 140-2 Level 2 하드웨어 토큰 또는 클라우드 HSM 필수 | FIPS 140-2 Level 2 하드웨어 토큰 또는 클라우드 HSM 필수 |
| **SmartScreen 평판** | **평판 즉시 획득 불가** (수백~수천 회 이상 정상 다운로드 누적 필요) | **평판 즉각 획득** (발급 즉시 경고창 없이 바로 실행) |
| **주요 활용처** | 소규모 개발사, 비영리 내부 도구 | 상용 엔터프라이즈 소프트웨어, 대외 공식 배포 |

---

## 3. 서명 방식: 로컬 PFX vs Azure Key Vault (Cloud HSM)

### 3.1 로컬 / 온프레미스 PFX 방식 (`signtool.exe`)
- 개발자의 물리 머신 또는 CI 러너에 비밀번호로 보호된 `.pfx` 인증서를 전달하여 서명합니다.
- **주의**: CA/Browser Forum의 최신 정책(2023년 이후)에 따라 신규 발급되는 모든 코드 서명 인증서는 하드웨어 보안 토큰(HSM) 또는 클라우드 키 저장소에만 보관 가능합니다.

### 3.2 Azure Key Vault / Azure Trusted Signing (권장)
- 물리적 USB 동글을 CI 서버에 꽂을 수 없는 GitHub Actions / Azure DevOps 환경을 위한 클라우드 서명 표준입니다.
- 인증서 개인키는 Azure Key Vault의 HSM 내부에 안전하게 격리되어 외부로 유출되지 않으며, `AzureSignTool` CLI를 통해 원격 서명됩니다.

---

## 4. 환경변수 아키텍처 설계 명세

RehearsePrompt는 민감한 인증서 및 비밀키를 코드 저장소에 절대 커밋하지 않으며, CI/CD 러너 또는 로컬 터미널의 환경변수를 통해서만 주입받도록 설계되었습니다.

| 환경변수명 | 형식 | 설명 | 지원 모드 |
| :--- | :--- | :--- | :--- |
| `WINDOWS_CERTIFICATE` | 문자열 (경로 or Base64) | 로컬 `.pfx` 파일 경로 또는 Base64 인코딩 문자열 | PFX 로컬/CI |
| `WINDOWS_CERTIFICATE_PASSWORD` | 비밀 문자열 | PFX 인증서 비밀번호 | PFX 로컬/CI |
| `WINDOWS_TIMESTAMP_URL` | URL | RFC 3161 호환 타임스탬프 서버 URL (기본값: `http://timestamp.digicert.com`) | 공통 |
| `AZURE_KEY_VAULT_URI` | URL | Azure Key Vault 인스턴스 URI (예: `https://kv-rehearse.vault.azure.net/`) | Azure HSM |
| `AZURE_CLIENT_ID` | GUID | Azure App Registration 클라이언트(애플리케이션) ID | Azure HSM |
| `AZURE_CLIENT_SECRET` | 비밀 문자열 | Azure 서비스 주체 클라이언트 시크릿 | Azure HSM |
| `AZURE_TENANT_ID` | GUID | Azure Active Directory 테넌트 ID | Azure HSM |
| `AZURE_CERTIFICATE_NAME` | 문자열 | Key Vault 내에 등록된 인증서 리소스 이름 | Azure HSM |

---

## 5. 바이너리별 서명 절차 (EXE, DLL, MSI)

서명 도구 체인은 `scripts/sign-windows.ps1`을 통해 단일 명령(`npm run sign:win`)으로 실행되며 다음 3가지 유형의 바이너리를 일괄 처리합니다:

1. **실행 파일 (EXE)**:
   - `RehearsePrompt.exe`, `RehearsePrompt-Setup-1.0.0.exe`, `RehearsePrompt-1.0.0-Portable.exe`
   - 명령어:
     ```powershell
     signtool sign /f cert.pfx /p "비밀번호" /fd sha256 /tr "http://timestamp.digicert.com" /td sha256 RehearsePrompt.exe
     ```
2. **동적 링크 라이브러리 (DLL)**:
   - 패키징 디렉터리 내의 서드파티 바이너리(`ffmpeg.dll`, `d3dcompiler_47.dll` 등)에 무결성 서명을 추가하여 안티바이러스(Defender)의 오탐을 원천 차단합니다.
3. **설치 패키지 (MSI)**:
   - `RehearsePrompt-Setup-1.0.0.msi`의 `MsiDigitalSignature` 내부 테이블에 서명을 삽입하여 Active Directory GPO 대량 배포 시 인증 정책을 통과시킵니다.

---

## 6. RFC 3161 타임스탬프 서버의 중요성

코드 서명 시 타임스탬프(`/tr`, `/td sha256`)는 반드시 적용되어야 합니다.

- **이유**: 코드 서명 인증서에는 1년~3년의 유효 기간이 존재합니다. 타임스탬프가 적용되어 있으면, **인증서의 유효 기간이 만료된 이후에도 "서명 당시에는 인증서가 유효했다"는 사실을 암호학적으로 증명**할 수 있으므로 사용자가 앱을 영구적으로 정상 실행할 수 있습니다.
- **권장 타임스탬프 서버**:
  - DigiCert: `http://timestamp.digicert.com`
  - Sectigo: `http://timestamp.sectigo.com`

---

## 7. 서명 없는(Unsigned) 테스트 빌드 운영 가이드

코드 서명 환경변수가 주입되지 않은 경우 RehearsePrompt의 빌드 스크립트는 오류를 내며 멈추지 않고, 자동으로 **[MODE: TEST / UNSIGNED BUILD]**로 전환하여 무서명 테스트 패키지를 정상 생성합니다.

### 7.1 개발자 및 테스터 설치 방법
1. 생성된 `release/RehearsePrompt-Setup-1.0.0.exe`를 실행합니다.
2. 파란색 "Windows의 PC 보호" 창이 나타나면 좌측 상단의 **[추가 정보]** 링크를 클릭합니다.
3. 우측 하단의 **[실행]** 버튼을 클릭하여 정상 설치를 완료합니다.

### 7.2 보안 및 출처 확인 원칙 (필수 공지)
- **공식 출처 확인**: 사용자는 반드시 공식 GitHub 저장소([https://github.com/rehearseprompt/rehearse-prompt](https://github.com/rehearseprompt/rehearse-prompt))의 릴리스 페이지에서 다운로드해야 합니다.
- **체크섬 검증**: 다운로드한 파일이 변조되지 않았음을 확인하기 위해 PowerShell에서 해시를 대조하세요:
  ```powershell
  Get-FileHash .\RehearsePrompt-Setup-1.0.0.exe -Algorithm SHA256
  ```
- **민감 환경 실행 주의**: 자체 서명(Unsigned) 상태의 바이너리는 엔터프라이즈 망분리 PC, 금융망, 정부 공공기관 등 보안 정책상 미서명 소프트웨어 실행이 차단된 환경에서는 관리자의 허가 없이 실행하지 마십시오.
