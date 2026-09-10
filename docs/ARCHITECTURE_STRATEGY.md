# RehearsePrompt 크로스 플랫폼 아키텍처 지원 전략 및 산출물 명명 규격

본 문서는 RehearsePrompt의 Windows 및 macOS 대상 프로세서 아키텍처(x64, arm64, Universal) 지원 전략, 의사결정 근거, 시스템 요구사항 고지 방안, 그리고 릴리스 산출물의 표준 명명 규칙을 정의합니다.

---

## 1. Windows 아키텍처 전략

### 1.1 기본 아키텍처: `x86_64-pc-windows-msvc` (x64)
- **선정 사유**: Windows 데스크톱 PC 시장의 95% 이상을 차지하는 표준 64비트 x86 아키텍처입니다.
- **배포 형식**: NSIS 인스톨러, 엔터프라이즈 MSI 패키지, 무설치 포터블 바이너리 모두 x64를 1차 기본(Tier 1) 공식 지원으로 제공합니다.

### 1.2 Windows on ARM (ARM64) 지원성 검토 및 요구사항 고지
- **검토 결과**:
  - Qualcomm Snapdragon X Elite, Microsoft Surface Pro 등 최신 Windows 11 on ARM 디바이스에는 **Prism 고성능 x64 에뮬레이션 엔진**이 운영체제 차원에서 기본 탑재되어 있습니다.
  - 따라서 별도의 ARM64 전용 빌드 없이도 x64 인스톨러(`RehearsePrompt-1.0.0-Windows-x64-setup.exe`)와 포터블 파일이 ARM64 Windows 기기에서 즉시 정상 구동됩니다.
- **시스템 요구사항 고지 명시**:
  - 네이티브 ARM64 바이너리는 향후 로드맵으로 관리하며, 공식 요구사항에 다음과 같이 명시합니다:
  > **[시스템 요구사항 안내]**: Windows 10/11 64-bit (Intel/AMD x64 프로세서 공식 권장). Windows 11 on ARM 기기(Snapdragon)의 경우 OS 내장 x64 에뮬레이션 엔진을 통해 원활히 실행 가능합니다.

---

## 2. macOS 아키텍처 전략: Option A (별도 파일) vs Option B (Universal Binary)

| 비교 항목 | Option A: 별도 파일 배포 (채택) | Option B: Universal Binary (FAT) |
| :--- | :--- | :--- |
| **산출물 형태** | `RehearsePrompt-1.0.0-macOS-arm64.dmg`<br>`RehearsePrompt-1.0.0-macOS-x64.dmg` | `RehearsePrompt-1.0.0-macOS-universal.dmg` |
| **타깃 아키텍처** | Apple Silicon (`aarch64-apple-darwin`)<br>Intel Mac (`x86_64-apple-darwin`) | arm64 + x86_64 결합 |
| **인스톨러 파일 크기** | **각 약 85 MB (경량화)** | **약 170 MB 이상 (2배 급증)** |
| **빌드/서명 복잡도** | **단순함 (아키텍처별 독립 서명/공증)** | **매우 높음 (`lipo` 슬라이스 결합 및 서명 충돌 위험)** |
| **Apple 공증 성공률** | **최상 (Apple Notary Service 즉시 통과)** | **주의 필요 (슬라이스 해시 불일치 거부 위험)** |

### 2.1 Option A (별도 파일 배포) 선택 이유
1. **다운로드 대역폭 및 사용자 대기 시간 50% 절감**:
   Electron 앱은 Chromium 렌더러와 V8 엔진을 자체 내장합니다. Universal Binary로 제작 시 실행 바이너리가 2벌 포함되어 용량이 170MB를 초과하게 됩니다. 분리 빌드를 채택함으로써 85MB 수준의 가벼운 설치 파일을 제공합니다.
2. **Apple Notarytool 공증 안정성 확보**:
   Universal Binary는 두 아키텍처 바이너리를 `lipo` 유틸리티로 결합한 후 서명해야 하는데, 네이티브 라이브러리 슬라이스 간 타임스탬프나 권한 선언이 미세하게 다를 경우 Apple 공증 검사에서 거부되는 사례가 빈번합니다. 분리 빌드는 독립적으로 서명/공증되므로 안정성이 월등합니다.
3. **Apple Silicon 중심의 생태계 전환**:
   현재 활성 Mac 사용자의 대다수가 Apple Silicon(M1/M2/M3/M4) 환경이므로, 대다수의 사용자에게 불필요한 구형 Intel 바이너리를 함께 다운로드받게 할 이유가 없습니다.

---

## 3. 표준 산출물 명명 규칙 (Naming Convention)

릴리스 파일명은 운영체제, 버전, 아키텍처, 패키지 유형을 명확히 식별할 수 있도록 아래 표준 형식을 엄격히 준수합니다.

```text
${productName}-${version}-${os}-${arch}[-${type}].${ext}
```

### 3.1 공식 배포 파일 목록

| 운영체제 | 타깃 아키텍처 | 형식 | 표준 릴리스 파일명 |
| :--- | :--- | :--- | :--- |
| **Windows** | x64 (AMD64) | NSIS 인스톨러 | `RehearsePrompt-1.0.0-Windows-x64-setup.exe` |
| **Windows** | x64 (AMD64) | MSI 패키지 | `RehearsePrompt-1.0.0-Windows-x64.msi` |
| **Windows** | x64 (AMD64) | 무설치 단일 파일 | `RehearsePrompt-1.0.0-Windows-x64-portable.exe` |
| **macOS** | arm64 (Apple Silicon) | DMG 디스크 이미지 | `RehearsePrompt-1.0.0-macOS-arm64.dmg` |
| **macOS** | x64 (Intel Mac) | DMG 디스크 이미지 | `RehearsePrompt-1.0.0-macOS-x64.dmg` |
| **macOS** | Universal (검토용) | DMG 디스크 이미지 | `RehearsePrompt-1.0.0-macOS-universal.dmg` |
| **macOS** | arm64 / x64 | 압축 아카이브 | `RehearsePrompt-1.0.0-macOS-arm64.zip`<br>`RehearsePrompt-1.0.0-macOS-x64.zip` |

---

## 4. 원본 빌드 파일과 릴리스 파일 간의 추적 가능성 (Traceability)

빌드 도구(`electron-builder`)의 원본 출력 파일과 표준 릴리스 파일의 매핑 관계는 [`release/RELEASE_MANIFEST.json`](../release/RELEASE_MANIFEST.json)과 [`release/SHA256SUMS.txt`](../release/SHA256SUMS.txt)를 통해 1:1로 보존됩니다.

```text
[원본 빌드 파일]                            [표준 릴리스 파일]                            [SHA-256 해시 일치]
RehearsePrompt-Setup-1.0.0.exe      ──▶  RehearsePrompt-1.0.0-Windows-x64-setup.exe    (793C9E183504...76B)
RehearsePrompt-Setup-1.0.0.msi      ──▶  RehearsePrompt-1.0.0-Windows-x64.msi          (C895BD154DEF...64A)
RehearsePrompt-1.0.0-Portable.exe   ──▶  RehearsePrompt-1.0.0-Windows-x64-portable.exe (5F89E2C53FF7...287)
```
모든 파일은 복제 후에도 바이트 단위 해시가 완벽히 일치하여 위변조 없이 추적 가능합니다.
