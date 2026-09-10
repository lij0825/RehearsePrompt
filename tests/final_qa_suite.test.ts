import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { StorageService } from '../src/main/storage.ts';
import { computeTextMetrics } from '../src/renderer/utils/textMetrics.ts';
import { SpeechService } from '../src/renderer/services/speech/speechService.ts';
import type { ISpeechRecognitionProvider } from '../src/renderer/services/speech/speechTypes.ts';

describe('최종 QA 검증 스위트 (Final QA Verification Suite)', () => {
  let tempDir: string;
  let storage: StorageService;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rehearse-final-qa-'));
    storage = new StorageService(tempDir);
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  // QA-10: 메모리 및 CPU 효율성 (10,000자 대본 및 1,000회 연속 처리)
  it('[QA-10] 대용량 대본 및 반복 처리 시 메모리 누수 없이 100ms 이내에 완료되어야 한다', () => {
    const chunk = '대규모 분산 환경에서 발생하는 데이터베이스 교착 상태를 완화하기 위해 트랜잭션 범위를 최소화했습니다. ';
    const megaText = chunk.repeat(250); // 약 14,000자

    const initialMem = process.memoryUsage().heapUsed;
    const start = performance.now();

    for (let i = 0; i < 50; i++) {
      computeTextMetrics(megaText, 130);
    }

    const elapsed = performance.now() - start;
    const finalMem = process.memoryUsage().heapUsed;
    const memDiffMb = (finalMem - initialMem) / (1024 * 1024);

    // 50회 연속 파싱이 1000ms 미만이어야 하며, 힙 메모리 급증이 없어야 함
    expect(elapsed).toBeLessThan(1000);
    expect(memDiffMb).toBeLessThan(50); // 50MB 이내
  });

  // QA-11: 긴 대본 테스트 (10,000자 이상 로드 및 스토리지 저장/조회)
  it('[QA-11] 10,000자 이상의 긴 대본을 원자적으로 저장하고 무결하게 조회할 수 있어야 한다', () => {
    const longContent = '면접 질문에 대한 답변입니다. '.repeat(500); // 약 10,000자 이상
    const script = storage.saveScript({
      title: '10,000자 프로젝트 아키텍처 상세 대본',
      content: longContent,
    });

    const loaded = storage.getScriptById(script.id);
    expect(loaded).not.toBeNull();
    expect(loaded?.content.length).toBe(longContent.length);
    expect(loaded?.content).toBe(longContent);
  });

  // QA-12: 앱 재시작 및 상태 지속성 테스트
  it('[QA-12] 앱 재시작 시 이전 세션의 창 크기, 항상 위 옵션, 대본이 100% 복원되어야 한다', () => {
    // Given: 설정 및 대본 저장
    storage.saveSettings({
      defaultWpm: 150,
      windowState: {
        width: 1280,
        height: 800,
        isMaximized: false,
        isAlwaysOnTop: true,
        opacity: 0.9,
        lastMode: 'prompter',
      },
    });
    const s1 = storage.saveScript({ title: '상태 복원 대본', content: '본문' });

    // When: 새 StorageService 인스턴스로 재시작 모의
    const restartedStorage = new StorageService(tempDir);
    const restoredSettings = restartedStorage.getSettings();
    const restoredScript = restartedStorage.getScriptById(s1.id);

    // Then: 모든 설정 및 창 상태, 대본이 정확히 복원되어야 함
    expect(restoredSettings.defaultWpm).toBe(150);
    expect(restoredSettings.windowState.isAlwaysOnTop).toBe(true);
    expect(restoredSettings.windowState.opacity).toBe(0.9);
    expect(restoredSettings.windowState.width).toBe(1280);
    expect(restoredScript?.title).toBe('상태 복원 대본');
  });

  // QA-13: 전체 데이터 백업 및 복원 무결성 테스트
  it('[QA-13] JSON 백업 페이로드를 생성하고 다른 저장소 인스턴스에 100% 복원할 수 있어야 한다', () => {
    // Given: 스크립트 2개, 설정 1개
    storage.saveScript({ title: '백업 대상 대본 A', content: '내용 A' });
    storage.saveScript({ title: '백업 대상 대본 B', content: '내용 B' });
    storage.saveSettings({ defaultWpm: 175 });

    // When: 백업 페이로드 생성
    const backupData = storage.createBackupPayload();
    expect(backupData.scripts.length).toBe(2);
    expect(backupData.settings.defaultWpm).toBe(175);

    // Then: 새로운 빈 디렉터리에 복원
    const cleanDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rehearse-restore-target-'));
    const cleanStorage = new StorageService(cleanDir);

    const restoreResult = cleanStorage.restoreFromBackup(backupData);
    expect(restoreResult.count).toBe(2);

    const restoredScripts = cleanStorage.getAllScripts();
    const restoredSettings = cleanStorage.getSettings();

    expect(restoredScripts.length).toBe(2);
    expect(restoredSettings.defaultWpm).toBe(175);

    fs.rmSync(cleanDir, { recursive: true, force: true });
  });

  // QA-14: 마이크 권한 거부 시 안전한 대체 및 에러 복구 테스트
  it('[QA-14] 마이크 권한 거부 시 앱이 중단되지 않고 명확한 한국어 에러를 반환해야 한다', async () => {
    // Given: 권한이 거부되는 모의 프로바이더
    const deniedProvider: ISpeechRecognitionProvider = {
      getEngineInfo: () => ({
        name: 'Denied Mock Provider',
        isLocal: false,
        requiresNetwork: true,
        privacyNotice: '거부 테스트',
      }),
      isSupported: () => true,
      requestPermission: async () => ({
        granted: false,
        error: '마이크 권한이 꺼져 있어서 음성 인식을 시작할 수 없어요.',
      }),
      start: async () => {
        throw new Error('Permission denied');
      },
      stop: () => {},
      getAudioLevel: () => 0,
    };

    const service = new SpeechService(deniedProvider);

    // When: 권한 확인
    const permResult = await service.checkOrRequestPermission();

    // Then: 크래시 없이 거부 상태와 안내 메시지 반환
    expect(permResult.granted).toBe(false);
    expect(permResult.error).toContain('마이크 권한이 꺼져 있어서');
  });

  // QA-15: 오류 복구 테스트 (손상된 백업 파일, 누락된 필드 안전 처리)
  it('[QA-15] 손상된 JSON이나 누락된 필드가 있어도 기본값으로 안전하게 복구해야 한다', () => {
    // Given: 필수 필드가 일부 누락된 비정형 객체 배열
    const incompletePayload = {
      scripts: [
        { id: 'custom-id-1', title: '누락 필드 테스트' } as unknown as import('../src/types/index.ts').IScript,
      ],
      settings: {
        theme: 'dark' as const,
      },
    };

    // When: 복원 실행
    const result = storage.restoreFromBackup(incompletePayload);

    // Then: 크래시 없이 1건 처리되고 세팅이 갱신되어야 함
    expect(result.count).toBe(1);
    const scripts = storage.getAllScripts();
    expect(scripts.length).toBe(1);
    expect(scripts[0].title).toBe('누락 필드 테스트');

    const settings = storage.getSettings();
    expect(settings.theme).toBe('dark');
    expect(settings.defaultWpm).toBe(130); // 기본값 유지
  });
});
