# RehearsePrompt - 변경 이력서 (Changelog)

모든 주요 변경 사항은 이 파일에 기록됩니다.  
이 프로젝트는 [Semantic Versioning](https://semver.org/lang/ko/)을 준수합니다.

---

## [1.0.0-planning] - 2026-09-10

### 기획 및 설계 (PHASE 0 & PHASE 1)
- **개발 환경 조사 완료**:
  - Windows 11 Pro 64-bit, Node.js v22.20.0, npm 10.9.3, Python 3.14.0, Git 2.51.0 환경 식별.
  - Rust 및 C++ MSVC 빌드 도구 미설치 상태 확인 -> 초경량/고안정성 Electron + React 19 + TypeScript + Vite 기술 스택 채택 보고 수립.
- **8대 핵심 설계 문서 작성**:
  - `docs/PRODUCT_REQUIREMENTS.md`: 제품 요구사항 정의서 및 비목적/윤리 규정 명시.
  - `docs/ARCHITECTURE.md`: 프로세스 격리, IPC 계약, 3대 스크롤 엔진, TDS 컴포넌트 아키텍처.
  - `docs/DATA_MODEL.md`: Script, Version, PracticeSession, AppSettings 엔티티 및 무결성 정책.
  - `docs/UX_FLOW.md`: 3클릭 완료 규칙, 토스 디자인 시스템(TDS) 컴포넌트 레이아웃, 해요체 표준 카피.
  - `docs/TEST_PLAN.md`: 자동화 테스트 및 14개 항목 수동 테스트 체크리스트.
  - `docs/PLATFORM_NOTES.md`: Windows/macOS 런타임 제약 및 화면 공유 투명성 보장.
  - `docs/KNOWN_LIMITATIONS.md`: Web Speech API, 로컬 저장소, 단축키 충돌 대응 가이드.
  - `docs/CHANGELOG.md`: 버전 히스토리 추적 체계 구축.

## [1.0.0-qa-final] - 2026-09-10

### 버그 수정 및 안정화 (Smoke Test 무한 대기 문제 해결 및 리소스 실측)
- **SmokeTestRunner 중앙 관리자 클래스 도입 (`src/main/main.ts`)**:
  - `ready-to-show` 이벤트에만 종속되어 있던 비정상 대기 문제 해결.
  - 10초 전역 안전 타임아웃(Safety Watchdog)을 도입하여 어떤 예외 상황에서도 무한 대기 방지.
  - 2단계 안전 종료 파이프라인(`destroy()` -> `app.quit()` -> 1.5초 후 `app.exit(exitCode)` 보장) 구축.
  - Smoke test 모드 전용 `minimal` 프로필 적용: 글로벌 단축키 등록 제외, 창 위치 저장 리스너 제외로 OS 리소스 해제 보장.
- **프로세스 트리 리소스 벤치마크 및 JSON 자동 생성**:
  - Electron 34의 `app.getAppMetrics()` 연동을 통해 Browser(Main), GPU, Utility, Tab(Renderer) 등 4개 프로세스 트리의 WorkingSet, PrivateBytes, CPU 사용률을 실측하여 `smoke-test-result.json`으로 저장.
- **PowerShell 테스트 스크립트 작성 (`scripts/run-smoke-test.ps1`)**:
  - npx 래퍼 우회 및 실제 Electron 바이너리 직접 실행.
  - 유한 타임아웃(`WaitForExit(12s)`) 및 잔여 프로세스 0개 자동 검증 체계 구축.
- **종합 QA 테스트 검증**:
  - 타입 검사 100% 무오류 통과.
  - Vitest 28개 단위/통합/QA 테스트 100% 통과.
  - 3회 연속 스모크 테스트 100% 정상 종료 (평균 1.79초, 잔여 프로세스 0개).
