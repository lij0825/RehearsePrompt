# RehearsePrompt CI/CD 보안 및 Secrets 관리 가이드

본 문서는 GitHub Actions 기반 CI/CD 파이프라인(`ci.yml`, `build-windows.yml`, `build-macos.yml`, `release.yml`)에서 사용되는 **보안 비밀(Secrets)의 목록, 용도, 등록 절차 및 안전한 취급 원칙**을 설명합니다.

---

## 1. 필수 보안 원칙 (Security Principles)

1. **실제 비밀값 로그 출력 절대 금지**:  
   GitHub Actions 러너는 등록된 Secret 값을 자동으로 감지하여 로그에 `***`로 마스킹합니다. 스크립트나 커맨드라인에서 비밀값을 에코(`echo`)하거나 디버그 출력하지 않습니다.
2. **로컬 저장소 커밋 금지**:  
   `.gitignore`에 `*.pfx`, `*.p12`, `*.pem`, `*.key`, `.env*` 파일이 등록되어 있어 로컬 파일시스템의 인증서나 비밀번호가 Git 저장소에 커밋되는 것을 원천 차단합니다.
3. **조건부 서명/공증 (Graceful Fallback)**:  
   저장소에 Secret이 등록되지 않은 경우 파이프라인이 실패하지 않고 자동으로 **"미서명 테스트 빌드(Unsigned Test Build)"**로 분류하여 안전하게 아티팩트를 생성합니다.
4. **보호된 환경 실행**:  
   코드 서명 및 배포 단계는 GitHub의 태그 보호 정책(`v*.*.*`) 및 관리자 권한 환경에서만 실행됩니다.

---

## 2. 플랫폼별 GitHub Secrets 일람표

### A. Windows 코드 서명 (Authenticode)

| Secret 이름 | 필수 여부 | 형식 / 예시 | 용도 설명 |
| :--- | :---: | :--- | :--- |
| **`WINDOWS_CERTIFICATE`** | 선택 | Base64 문자열 | 코드 서명용 PFX 인증서 파일 내용을 base64로 인코딩한 문자열 |
| **`WINDOWS_CERTIFICATE_PASSWORD`**| 선택 (PFX 사용 시) | 일반 문자열 | PFX 인증서의 개인키 암호 |
| **`WINDOWS_TIMESTAMP_URL`** | 선택 | URL (기본값 제공) | 서명 시점 공인을 위한 RFC 3161 타임스탬프 서버 (예: `http://timestamp.digicert.com`) |
| **`AZURE_TENANT_ID`** | 선택 (클라우드 서명) | UUID | Azure Key Vault 인증용 테넌트 ID |
| **`AZURE_CLIENT_ID`** | 선택 (클라우드 서명) | UUID | Azure Key Vault 접근 권한이 부여된 서비스 주체(App) 클라이언트 ID |
| **`AZURE_CLIENT_SECRET`** | 선택 (클라우드 서명) | 보안 문자열 | 서비스 주체 비밀키 |
| **`AZURE_KEY_VAULT_URI`** | 선택 (클라우드 서명) | URI | Azure Key Vault 주소 (예: `https://<vault-name>.vault.azure.net`) |
| **`AZURE_CERTIFICATE_NAME`** | 선택 (클라우드 서명) | 식별자 | Key Vault 내에 저장된 인증서 이름 |

> **PFX base64 생성 방법 (로컬 터미널)**:
> ```powershell
> [Convert]::ToBase64String([IO.File]::ReadAllBytes("certificate.pfx")) | Clip
> ```

---

### B. macOS 코드 서명 및 Apple 공증 (Notarytool)

| Secret 이름 | 필수 여부 | 형식 / 예시 | 용도 설명 |
| :--- | :---: | :--- | :--- |
| **`APPLE_CERTIFICATE`** | 선택 | Base64 문자열 | Apple Developer ID Application 인증서(`certificate.p12`)의 base64 인코딩 문자열 |
| **`APPLE_CERTIFICATE_PASSWORD`**| 선택 (P12 사용 시) | 일반 문자열 | P12 인증서 암호 |
| **`KEYCHAIN_PASSWORD`** | 선택 | 일반 문자열 | CI 러너에서 임시로 생성할 키체인의 암호 (미지정 시 무작위 생성) |
| **`APPLE_API_KEY`** | 선택 (권장 공증 방식) | Base64 / 텍스트 | App Store Connect API 개인키(`AuthKey_XXXXXXXXXX.p8`) 내용 |
| **`APPLE_API_KEY_ID`** | 선택 (권장 공증 방식) | 10자리 문자열 | App Store Connect API 키 ID (예: `2X9R4HXF34`) |
| **`APPLE_API_ISSUER`** | 선택 (권장 공증 방식) | UUID | App Store Connect Issuer ID |
| **`APPLE_ID`** | 선택 (대체 방식) | 이메일 주소 | Apple Developer 계정 이메일 |
| **`APPLE_APP_SPECIFIC_PASSWORD`**| 선택 (대체 방식) | 16자리 문자열 | Apple ID 계정 관리에서 발급받은 앱용 암호 (`xxxx-xxxx-xxxx-xxxx`) |
| **`APPLE_TEAM_ID`** | 선택 | 10자리 문자열 | Apple Developer 10자리 조직 Team ID |

> **P12 base64 생성 방법 (macOS 터미널)**:
> ```bash
> base64 -i DeveloperID.p12 | pbcopy
> ```

---

## 3. GitHub 저장소에 Secrets 등록 방법

1. RehearsePrompt GitHub 저장소로 이동합니다.
2. 상단 메뉴의 **[Settings]** 탭을 클릭합니다.
3. 좌측 사이드바에서 **[Secrets and variables]** > **[Actions]**를 선택합니다.
4. **`[New repository secret]`** 녹색 버튼을 누르고, 위의 표에 명시된 이름과 값을 각각 입력한 뒤 **`[Add secret]`**을 클릭합니다.

---

## 4. 파이프라인 실패 처리 기준 (Quality Gates)

CI/CD 파이프라인은 다음 항목 중 하나라도 감지될 경우 **빌드를 즉시 실패(Exit Code 1)로 중단**합니다:

1. **테스트 실패**: Vitest 28개 단위/통합 테스트 중 1건이라도 실패하는 경우.
2. **버전 불일치**: `package.json`의 버전과 Git 릴리스 태그(`vX.Y.Z`)가 일치하지 않는 경우.
3. **산출물 누락**: 예상된 출력 디렉터리(`release/`)에 `.exe`, `.msi`, `.dmg` 설치 파일이 없는 경우.
4. **체크섬 생성 실패**: `SHA256SUMS.txt` 생성 도중 파일 해시 계산이 실패하거나 누락된 경우.
5. **잘못된 파일명**: 표준 파일명 템플릿(`RehearsePrompt-1.0.0-Windows-x64-setup.exe` 등)과 다른 형식인 경우.
6. **서명/공증 실패**: 관련 Secret이 입력되었으나 인증서 만료나 서명 오류로 실패한 경우.
7. **릴리스 파일 크기 0 (Zero-Byte)**: 산출물 파일 크기가 0이거나 최소 기준(10MB) 미만인 경우.
