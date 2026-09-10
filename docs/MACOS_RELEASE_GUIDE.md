# RehearsePrompt macOS 빌드, 패키징 및 릴리스 엔지니어링 명세서

본 문서는 RehearsePrompt의 macOS 배포 산출물(`.app`, `.dmg`, `.zip`), 지원 아키텍처(Apple Silicon vs Intel vs Universal), Gatekeeper 및 Apple Notarytool 공증 파이프라인, 그리고 22개 항목의 macOS 품질 검증 기준을 규정합니다.

---

## 1. macOS 빌드 산출물 규격

| 산출물 형식 | 생성 파일 예시 | 설명 및 특징 |
| :--- | :--- | :--- |
| **애플리케이션 번들** | `mac-arm64/RehearsePrompt.app`<br>`mac/RehearsePrompt.app` | macOS 표준 실행 패키지 구조 (`Contents/MacOS`, `Resources/icon.icns`, `Info.plist`) |
| **디스크 이미지 (DMG)** | `RehearsePrompt-1.0.0-arm64.dmg`<br>`RehearsePrompt-1.0.0-x64.dmg` | 일반 사용자 배포 표준. Applications 바로가기 링크 및 볼륨 아이콘(`.VolumeIcon.icns`) 포함 |
| **압축 아카이브 (ZIP)** | `RehearsePrompt-1.0.0-arm64.zip`<br>`RehearsePrompt-1.0.0-x64.zip` | 앱 자동 업데이터(Auto-updater) 연동 및 무설치 추출용 아카이브 |

---

## 2. 지원 아키텍처 및 Universal Binary 전략 검토

RehearsePrompt는 macOS 환경에서 최적의 성능과 경량 패키지를 제공하기 위해 아키텍처별 빌드 전략을 수립했습니다.

### 2.1 아키텍처별 세부 사항
- **Apple Silicon (M1 / M2 / M3 / M4)**:
  - 타깃: `arm64` (`aarch64-apple-darwin`)
  - 아티팩트명: `RehearsePrompt-1.0.0-arm64.dmg` (~85 MB)
  - 특징: Rosetta 변환 오버헤드 없이 Apple Silicon NPU/CPU에서 네이티브 고속 구동 및 저전력 소비
- **Intel Mac**:
  - 타깃: `x64` (`x86_64-apple-darwin`)
  - 아티팩트명: `RehearsePrompt-1.0.0-x64.dmg` (~88 MB)
  - 특징: 구형 Intel 기반 Mac 기기 전용 네이티브 바이너리

### 2.2 Universal Binary (Lipo FAT 바이너리) 검토 결과
- **장점**: 사용자가 자신의 칩셋(Intel vs Apple Silicon)을 확인할 필요 없이 단 하나의 DMG만 다운로드하면 됨.
- **단점**:
  1. **바이너리 용량 2배 급증**: Chromium 런타임과 V8 엔진 바이너리가 2벌 포함되어 인스톨러 용량이 약 170MB 이상으로 급증함.
  2. **서명 및 공증 복잡도 증가**: `lipo` 병합 과정에서 Mach-O 슬라이스별 서명 해시가 불일치하거나 공증 시 특정 슬라이스 오류 발생 가능성이 높아짐.
- **최종 전략 채택**:
  - **아키텍처별 분리 빌드(`arm64`, `x64`)를 표준 배포 방식으로 채택**합니다.
  - 최신 Mac 사용자의 90% 이상을 차지하는 Apple Silicon 사용자에게 가장 가볍고 빠른 설치 경험을 제공합니다.

---

## 3. 호스트 머신 환경 분석 및 빌드 실행 메커니즘

### 3.1 로컬 머신 제약 확인
현재 개발 환경은 **Windows 11 (AMD64)** 호스트 머신입니다.
- `uname -m`, `sysctl -in sysctl.proc_translated`, `xcode-select`, `hdiutil` 등의 macOS 고유 유틸리티는 Windows 커널에서 동작하지 않습니다.
- `electron-builder` 역시 macOS DMG 및 Mach-O 번들링은 macOS 호스트에서만 공식 지원합니다 (`Build for macOS is supported only on macOS`).

### 3.2 클라우드 CI 러너를 통한 완전 자동화
RehearsePrompt는 이 플랫폼 제약을 완벽하게 해결하기 위해 **GitHub Actions의 `macos-latest` 러너**를 연동했습니다:
- **CI/CD 워크플로**: [`.github/workflows/release.yml`](../.github/workflows/release.yml)
- **트리거**: `git tag -a v1.0.0 -m "Release" && git push origin v1.0.0`
- **동작 방식**:
  1. GitHub의 네이티브 Apple Silicon/Intel macOS 러너가 가상 머신으로 가동됨.
  2. 최신 Xcode Command Line Tools 및 Node.js 22.x 자동 셋업.
  3. `npm run dist:mac` 명령으로 `arm64` 및 `x64` DMG/ZIP 바이너리 컴파일.
  4. Apple Developer ID 인증서 서명 및 `notarytool` 공증 수행.
  5. 스테이플링(`xcrun stapler staple`) 후 SHA-256 체크섬을 생성하여 GitHub Release로 자동 퍼블리시.

---

## 4. macOS 22대 품질 및 설치 테스트 검증 명세

macOS 환경에서 RehearsePrompt가 준수해야 하는 22대 테스트 케이스와 기대 결과입니다:

| 번호 | 테스트 항목 | 검증 기준 및 결과 |
| :---: | :--- | :--- |
| **1** | DMG 마운트 (Open DMG) | `.dmg` 더블 클릭 시 사용자 지정 창 크기(540x380) 및 배경으로 부드럽게 마운트 |
| **2** | Applications 복사 | DMG 내부의 바로가기 링크(`/Applications`)로 드래그 앤 드롭 복사 완료 |
| **3** | Applications 실행 | `/Applications/RehearsePrompt.app` 더블 클릭 시 즉각 실행 |
| **4** | Dock 등록 | 앱 구동 시 Dock 타일에 1024x1024 Retina 커스텀 아이콘 정상 노출 및 고정 지원 |
| **5** | 앱 종료 및 재실행 | `Cmd + Q`로 클린 셧다운 후 재실행 시 0초 딜레이 실행 |
| **6** | 앱 삭제 (Trash) | `/Applications/RehearsePrompt.app`을 휴지통으로 이동 시 깨끗이 제거 |
| **7** | 재설치 (Re-install) | 새 버전 DMG로 덮어쓰기 설치 시 이전 설정 및 대본 데이터 정상 계승 |
| **8** | 마이크 권한 허용 | 최초 마이크 시작 시 TCC 시스템 팝업 노출 및 허용 시 음성 인식 정상 동작 |
| **9** | 마이크 권한 거부 | 사용자가 TCC 거부 시 친절한 토스트 안내 및 [속도 모드(WPM)]로 안전 전환 |
| **10**| 카메라 권한 허용 | **해당 없음 (카메라 권한 키를 완전히 제거하여 프롬프트 자체를 띄우지 않음)** |
| **11**| 카메라 권한 거부 | **해당 없음 (최소 권한의 원칙 준수)** |
| **12**| 파일 접근 권한 (Sandbox) | `~/Library/Application Support/RehearsePrompt/storage/` 격리 폴더에만 안전 저장 |
| **13**| 다중 모니터 (Multi-Display)| 보조 모니터 또는 화상 회의용 서브 디스플레이로 창 이동 시 부드러운 스케일링 |
| **14**| Retina 고해상도 디스플레이 | HiDPI(2x) 렌더링에서 글씨 및 아이콘 뭉개짐 없는 픽셀 퍼펙트 렌더링 |
| **15**| 라이트 모드 (Light Appearance)| macOS 라이트 테마에 맞춘 깔끔한 화이트/블루 배경 렌더링 |
| **16**| 다크 모드 (Dark Appearance) | 시스템 다크 모드 감지 시 눈부심 없는 고대비 다크 텔레프롬프터 UI 전환 |
| **17**| Apple Silicon (Native) | M1/M2/M3/M4에서 프로세스 종류가 `Apple`로 네이티브 구동 확인 |
| **18**| Intel (Native / Rosetta) | Intel Mac에서 `Intel` 네이티브 구동 확인 |
| **19**| 인터넷 없는 오프라인 환경 | Wi-Fi 연결 해제 상태에서도 대본 관리, 편집, WPM 스크롤 100% 동작 |
| **20**| 업데이트 후 데이터 보존 | 새 버전 설치 후에도 기존 작성 대본 및 연습 세션 이력 100% 보존 |
| **21**| 한국어 사용자 계정 | 사용자 홈 경로에 한글이 포함된 경우(`~/사용자/`)에도 파일 I/O 정상 동작 |
| **22**| 공백 및 특수문자 경로 | 파일 시스템 경로에 띄어쓰기나 특수문자가 포함되어도 크래시 없이 정상 구동 |

---

## 5. Gatekeeper 및 Apple Notarytool 보안 컴플라이언스

- **보안 우회 금지 원칙**: 사용자 가이드 및 기술 문서에 Gatekeeper 보안 설정을 무단 우회하거나 격리 속성(`quarantine`)을 임의 해제하도록 유도하지 않습니다.
- **공식 배포 경로 안내**: 사용자는 반드시 GitHub 공식 릴리스 페이지에서 출처가 확인된 정식 DMG를 다운로드해야 합니다.
- **공증(Notarization) 및 스테이플링**:
  - `electron-builder` 설정에 `hardenedRuntime: true` 및 `entitlements.mac.plist`가 완비되어 있습니다.
  - CI 파이프라인에서 Apple Notary Service 통과 후 공증 티켓을 DMG에 직접 스테이플링(`xcrun stapler staple`)하여 오프라인 환경에서도 Gatekeeper 경고 없이 실행되도록 구성되었습니다.
- **조직 보안 정책 존중**: 기업용 관리형 Mac을 사용하는 임직원은 사내 보안 솔루션 정책을 준수해야 하며, 미인가 소프트웨어를 임의 설치하지 않도록 명문화했습니다.
