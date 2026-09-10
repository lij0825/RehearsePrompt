# RehearsePrompt macOS 설치 및 보안 설정 가이드

본 문서는 macOS 사용자를 위한 RehearsePrompt 설치, Gatekeeper(확인되지 않은 개발자) 보안 경고 해결법, 시스템 마이크 권한 승인 및 프로그램 제거 절차를 상세히 안내합니다.

---

## 1. 시스템 요구 사항 (System Requirements)

- **운영체제**: macOS 12 (Monterey), macOS 13 (Ventura), macOS 14 (Sonoma), macOS 15 (Sequoia) 이상
- **지원 칩셋**:
  - **Apple Silicon (M1 / M2 / M3 / M4)**: `RehearsePrompt-1.0.0-arm64.dmg` 권장
  - **Intel Mac**: `RehearsePrompt-1.0.0-x64.dmg` 권장
- **저장 공간**: 약 350MB 이상의 여유 공간
- **오디오 장비**: Mac 내장 마이크 또는 외장 USB/블루투스 마이크

---

## 2. 설치 파일 다운로드 및 설치 (DMG)

1. 사용 중인 Mac의 칩셋에 맞는 디스크 이미지(`DMG`) 파일을 다운로드합니다.
2. 다운로드한 `.dmg` 파일을 더블 클릭하여 마운트합니다.
3. 나타나는 설치 창에서 **RehearsePrompt** 아이콘을 오른쪽의 **Applications (응용 프로그램)** 폴더 바로가기로 드래그 앤 드롭합니다.
4. 복사가 완료되면 마운트된 DMG 창을 닫고, 바탕화면의 디스크 이미지를 추출(Eject)합니다.

---

## 3. macOS Gatekeeper 및 보안 정책 안내 (Security Compliance)

macOS의 Gatekeeper는 악성 소프트웨어로부터 Mac을 보호하기 위해 출처가 불분명하거나 변조된 소프트웨어의 실행을 엄격히 제한합니다.

### 3.1 공식 배포 경로 확인
- 반드시 신뢰할 수 있는 공식 배포 경로([RehearsePrompt GitHub Releases](https://github.com/lij0825/RehearsePrompt/releases))에서 제공하는 정식 릴리스 파일(`DMG`)을 다운로드해야 합니다.
- 출처가 확인되지 않은 제3자 사이트나 메신저를 통해 전달받은 설치 파일은 악성코드가 포함되어 있을 수 있으므로 절대 실행하지 마십시오.

### 3.2 개발 테스트용 미서명 앱 실행 안내
- 오픈소스/내부 테스트용 빌드의 경우 Apple Developer ID 서명 및 공증이 적용되지 않아 시스템 경고 팝업이 나타날 수 있습니다.
- 이는 신규 빌드 테스트 시 정상적으로 발생하는 보안 알림이며, 정식 릴리스 배포판은 Apple Notary Service 공증을 거쳐 배포됩니다.
- 개발 환경이나 테스트 머신에서 직접 검증하는 경우에만 시스템 설정의 [개인정보 보호 및 보안]에서 해당 앱의 실행 여부를 신중히 검토하세요.

### 3.3 배포자 및 조직 보안 원칙 준수
- **배포자 원칙**: 일반 대외 배포용 패키지를 제작할 때는 반드시 Apple Developer Program에 등록된 Developer ID Application 인증서로 서명하고, `notarytool`을 통해 Apple 공증을 완료한 후 티켓을 스테이플링(`xcrun stapler staple`)하여 배포해야 합니다.
- **기업 보안 준수**: 사용자는 회사의 보안 정책이나 엔드포인트 보호 소프트웨어 설정을 임의로 우회하거나 비활성화해서는 안 되며, 업무용 Mac에서는 사내 보안 관리자의 승인 절차를 거쳐 설치해야 합니다.

---

## 4. macOS 마이크 권한(TCC) 허용

RehearsePrompt의 발화 추적 및 음성 스크롤을 이용하려면 시스템 마이크 접근 권한이 필수입니다.

1. 앱을 처음 켜면 *"RehearsePrompt에서 마이크에 접근하려고 합니다"* 시스템 팝업이 나타납니다.
2. 반드시 **[허용(OK)]**을 선택합니다.
3. 만약 실수로 '허용 안 함'을 누르셨다면:
   - **[시스템 설정]** > **[개인정보 보호 및 보안]** > **[마이크]**로 이동합니다.
   - 목록에서 **RehearsePrompt** 스위치를 **[켬(On)]**으로 변경합니다.

---

## 5. 데이터 저장 위치 및 백업 안내

macOS 환경에서 RehearsePrompt의 모든 로컬 데이터는 Sandbox 보안 지침에 따라 다음 디렉터리에 저장됩니다:

```text
~/Library/Application Support/RehearsePrompt/storage/
├── scripts.json      # 사용자 작성 대본 및 리비전
├── sessions.json     # 모의 면접 연습 기록
└── settings.json     # UI 및 스크롤 환경설정
```

- Finder에서 `Cmd + Shift + G`를 누른 뒤 `~/Library/Application Support/RehearsePrompt/storage`를 입력하면 대본 데이터 폴더로 즉시 이동할 수 있습니다.

---

## 6. 프로그램 제거 (Uninstallation)

1. Finder에서 **[응용 프로그램]** 폴더로 이동합니다.
2. **RehearsePrompt.app**을 마우스로 끌어 휴지통으로 버립니다.
3. 완전히 데이터를 삭제하려면 `~/Library/Application Support/RehearsePrompt` 폴더를 휴지통에 버리고 비웁니다.
