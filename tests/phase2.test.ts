import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { StorageService } from '../src/main/storage.ts';

describe('PHASE 2: 백엔드 스토리지 및 기본 환경설정 단위 테스트', () => {
  let tempUserDataDir: string;
  let storage: StorageService;

  beforeEach(() => {
    // 임시 테스트 디렉터리 생성
    tempUserDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rehearse-prompt-test-'));
    storage = new StorageService(tempUserDataDir);
  });

  afterEach(() => {
    // 테스트 후 정리
    if (fs.existsSync(tempUserDataDir)) {
      fs.rmSync(tempUserDataDir, { recursive: true, force: true });
    }
  });

  it('기본 설정값이 올바르게 초기화되고 로드되는지 확인한다', () => {
    // Given: 초기화된 StorageService
    // When: 설정을 조회했을 때
    const settings = storage.getSettings();

    // Then: 기본값들이 design.md 및 요구사항에 부합해야 한다
    expect(settings.defaultWpm).toBe(130);
    expect(settings.autoSaveIntervalMs).toBe(800);
    expect(settings.language).toBe('ko');
    expect(settings.theme).toBe('light');
    expect(settings.privacy.telemetryEnabled).toBe(false);
  });

  it('설정 변경 시 원자적으로 저장되고 갱신되는지 확인한다', () => {
    // Given: 기존 설정
    const initial = storage.getSettings();
    expect(initial.defaultWpm).toBe(130);

    // When: WPM을 160으로 변경하고 저장
    const updated = storage.saveSettings({ defaultWpm: 160 });

    // Then: 반환값과 다시 조회한 값이 160이어야 한다
    expect(updated.defaultWpm).toBe(160);
    const reloaded = storage.getSettings();
    expect(reloaded.defaultWpm).toBe(160);
  });

  it('새 스크립트 저장, 조회, 소프트 삭제 및 복구 주기가 정상 동작하는지 확인한다', () => {
    // Given: 새 스크립트 데이터
    const newScriptData = {
      title: '1분 자기소개',
      content: '안녕하십니까. 신입 백엔드 엔지니어 지원자입니다.',
    };

    // When: 스크립트 저장
    const saved = storage.saveScript(newScriptData);

    // Then: ID가 부여되고 스크립트 목록에 포함되어야 한다
    expect(saved.id).toBeDefined();
    expect(saved.title).toBe('1분 자기소개');
    expect(saved.version).toBe(1);

    const allScripts = storage.getAllScripts();
    expect(allScripts.length).toBe(1);
    expect(allScripts[0].id).toBe(saved.id);

    // When: 스크립트 내용 수정
    const updatedScript = storage.saveScript({
      id: saved.id,
      content: '내용이 수정되었습니다.',
    });
    expect(updatedScript.version).toBe(2);

    // Then: 버전 스냅샷이 생성되었는지 확인
    const versions = storage.getScriptVersions(saved.id);
    expect(versions.length).toBe(1);
    expect(versions[0].content).toBe('안녕하십니까. 신입 백엔드 엔지니어 지원자입니다.');

    // When: 소프트 삭제
    const deleted = storage.deleteScript(saved.id, false);
    expect(deleted).toBe(true);
    const afterDelete = storage.getScriptById(saved.id);
    expect(afterDelete?.deletedAt).not.toBeNull();

    // When: 복구
    const restored = storage.restoreScript(saved.id);
    expect(restored).toBe(true);
    const afterRestore = storage.getScriptById(saved.id);
    expect(afterRestore?.deletedAt).toBeNull();
  });

  it('연습 세션 기록이 정상적으로 저장되고 조회되는지 확인한다', () => {
    // Given: 연습 세션 데이터
    const sessionData = {
      scriptId: 'test-script-id',
      startedAt: new Date().toISOString(),
      endedAt: new Date().toISOString(),
      duration: 120,
      scrollMode: 'constant' as const,
      averageWpm: 135,
      completionRate: 100,
      pauseCount: 1,
      microphoneUsed: false,
      notes: '첫 완독 성공',
      completed: true,
    };

    // When: 세션 저장
    const savedSession = storage.saveSession(sessionData);

    // Then: 세션 목록에서 조회 가능해야 한다
    expect(savedSession.id).toBeDefined();
    const allSessions = storage.getAllSessions();
    expect(allSessions.length).toBe(1);
    expect(allSessions[0].averageWpm).toBe(135);
  });
});
