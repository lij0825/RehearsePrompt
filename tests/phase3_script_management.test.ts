import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { StorageService } from '../src/main/storage.ts';
import {
  countCharacters,
  computeTextMetrics,
  sanitizeTitle,
} from '../src/renderer/utils/textMetrics.ts';

describe('PHASE 3: 텍스트 메트릭스 및 파서 단위 테스트', () => {
  it('한국어 입력의 단어 수, 글자 수, 문장 분리가 정확해야 한다', () => {
    // Given: 한국어 면접 답변 대본
    const koreanText = `안녕하십니까! 백엔드 개발자 지원자 홍길동입니다.
저는 분산 시스템 최적화에 관심이 많습니다.

지난 1년간 대규모 트래픽 프로젝트를 수행했습니다. 성공적으로 런칭을 마쳤습니다!`;

    // When: 메트릭스 계산
    const metrics = computeTextMetrics(koreanText, 130);

    // Then: 단어 수 및 문단 수 등이 정확히 계산되어야 한다
    expect(metrics.paragraphCount).toBe(2);
    expect(metrics.sentenceCount).toBe(5);
    expect(metrics.wordCount).toBe(20);
    expect(metrics.charCountWithoutSpaces).toBeGreaterThan(50);
    expect(metrics.estimatedDurationSeconds).toBeGreaterThan(0);
  });

  it('이모지(Surrogate Pairs)가 포함된 텍스트의 글자 수가 정확히 계산되어야 한다', () => {
    // Given: 다양한 복합 이모지가 포함된 대본
    const emojiText = '안녕하세요 🚀 화이팅! 🎤💼🔥';

    // When: 글자 수 계산
    const chars = countCharacters(emojiText);

    // Then: 공백 제외 글자 수가 올바르게 계산되어야 함
    expect(chars.withoutSpaces).toBe(13); // 안,녕,하,세,요,🚀,화,이,팅,!,🎤,💼,🔥 = 13
  });

  it('긴 대본 (10,000자 이상)도 지연 없이 즉시 통계가 산출되어야 한다', () => {
    // Given: 10,000자 이상의 긴 대본 생성
    const paragraph = '이것은 대규모 트래픽 환경에서 발생하는 분산 락 문제를 해결한 경험에 대한 상세한 설명입니다. ';
    const longText = paragraph.repeat(250); // 약 12,500자 이상

    // When: 성능 및 결과 측정
    const start = performance.now();
    const metrics = computeTextMetrics(longText, 130);
    const duration = performance.now() - start;

    // Then: 100ms 이내에 즉시 계산 완료되어야 함
    expect(duration).toBeLessThan(100);
    expect(metrics.charCountWithoutSpaces).toBeGreaterThan(9000);
    expect(metrics.wordCount).toBeGreaterThan(1500);
    expect(metrics.estimatedDurationSeconds).toBeGreaterThan(600);
  });

  it('빈 제목 입력 시 "제목 없는 스크립트"로 안전하게 폴백되어야 한다', () => {
    expect(sanitizeTitle('')).toBe('제목 없는 스크립트');
    expect(sanitizeTitle('   ')).toBe('제목 없는 스크립트');
    expect(sanitizeTitle(null)).toBe('제목 없는 스크립트');
    expect(sanitizeTitle('정상 제목')).toBe('정상 제목');
  });

  it('빈 본문 입력 시 모든 메트릭스가 0으로 정상 처리되어야 한다', () => {
    const metrics = computeTextMetrics('', 130);
    expect(metrics.wordCount).toBe(0);
    expect(metrics.charCountWithoutSpaces).toBe(0);
    expect(metrics.estimatedDurationSeconds).toBe(0);
    expect(metrics.paragraphCount).toBe(0);
    expect(metrics.sentenceCount).toBe(0);
    expect(metrics.formattedDuration).toBe('00분 00초');
  });
});

describe('PHASE 3: 스크립트 저장소 통합 및 에러 방어 테스트', () => {
  let tempDir: string;
  let storage: StorageService;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rehearse-script-test-'));
    storage = new StorageService(tempDir);
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('동일한 제목의 중복 스크립트 생성 시 고유 ID가 각각 생성되어 충돌 없이 저장되어야 한다', () => {
    // Given & When: 동일한 제목으로 2개 생성
    const script1 = storage.saveScript({ title: '1분 자기소개', content: '첫 번째 버전' });
    const script2 = storage.saveScript({ title: '1분 자기소개', content: '두 번째 버전' });

    // Then: 서로 다른 고유 ID를 가져야 한다
    expect(script1.id).not.toBe(script2.id);
    const all = storage.getAllScripts();
    expect(all.length).toBe(2);
  });

  it('스크립트 복제 시 (사본) 접미사가 붙고 즐겨찾기는 기본 해제되어야 한다', () => {
    // Given: 즐겨찾기된 원본 스크립트
    const original = storage.saveScript({
      title: '프로젝트 발표 대본',
      content: '핵심 아키텍처 설명',
      tags: ['발표', '기술'],
      isFavorite: true,
    });

    // When: 복제 실행
    const copy = storage.duplicateScript(original.id);

    // Then: 사본 메타데이터 확인
    expect(copy).not.toBeNull();
    expect(copy?.id).not.toBe(original.id);
    expect(copy?.title).toBe('프로젝트 발표 대본 (사본)');
    expect(copy?.isFavorite).toBe(false);
    expect(copy?.tags).toEqual(['발표', '기술']);
    expect(copy?.content).toBe('핵심 아키텍처 설명');
  });

  it('손상되거나 잘못된 JSON 파일을 가져오려 할 때 에러를 발생시키고 데이터를 오염시키지 않아야 한다', () => {
    // Given: 문법이 깨진 JSON 파일 생성
    const invalidJsonPath = path.join(tempDir, 'corrupted.json');
    fs.writeFileSync(invalidJsonPath, '{ title: "이것은 잘못된 JSON입니다", content: }', 'utf-8');

    // When & Then: importScript 호출 시 예외를 포착해야 함
    expect(() => storage.importScript(invalidJsonPath)).toThrow(/JSON 파일을 가져오지 못했어요/);

    // 기존 스토리지 목록은 여전히 정상 유지되어야 함
    const scripts = storage.getAllScripts();
    expect(scripts.length).toBe(0);
  });

  it('TXT 및 Markdown 대본 파일을 정상적으로 가져와 새 스크립트로 저장해야 한다', () => {
    // Given: 정상 마크다운 파일 생성
    const mdPath = path.join(tempDir, 'sample_speech.md');
    fs.writeFileSync(mdPath, '# 발표 시작\n\n대본 본문 내용입니다.', 'utf-8');

    // When: 가져오기 실행
    const imported = storage.importScript(mdPath);

    // Then: 파일명을 제목으로, 본문을 content로 파싱
    expect(imported.title).toBe('sample_speech');
    expect(imported.content).toContain('대본 본문 내용입니다.');
  });

  it('스크립트 파일 내보내기(TXT, MD, JSON)가 정상 작동해야 한다', () => {
    // Given: 테스트용 스크립트
    const script = storage.saveScript({
      title: '면접 최종 리허설',
      content: '마지막으로 하고 싶은 말은...',
      wordCount: 5,
      estimatedDuration: 10,
    });

    // When: TXT 및 MD 내보내기
    const txtTarget = path.join(tempDir, 'exported.txt');
    const mdTarget = path.join(tempDir, 'exported.md');
    const jsonTarget = path.join(tempDir, 'exported.json');

    storage.exportScript(script.id, 'txt', txtTarget);
    storage.exportScript(script.id, 'md', mdTarget);
    storage.exportScript(script.id, 'json', jsonTarget);

    // Then: 파일 존재 및 내용 검증
    expect(fs.existsSync(txtTarget)).toBe(true);
    expect(fs.readFileSync(txtTarget, 'utf-8')).toContain('마지막으로 하고 싶은 말은...');

    expect(fs.existsSync(mdTarget)).toBe(true);
    expect(fs.readFileSync(mdTarget, 'utf-8')).toContain('# 면접 최종 리허설');

    expect(fs.existsSync(jsonTarget)).toBe(true);
    const parsed = JSON.parse(fs.readFileSync(jsonTarget, 'utf-8'));
    expect(parsed.title).toBe('면접 최종 리허설');
  });

  it('앱 강제 종료 후에도 로컬 저장소 데이터가 완벽히 보존되어야 한다', () => {
    // Given: 스크립트 3개 작성
    storage.saveScript({ title: '스크립트 1', content: '내용 1' });
    storage.saveScript({ title: '스크립트 2', content: '내용 2' });
    storage.saveScript({ title: '스크립트 3', content: '내용 3' });

    // When: 앱 재시작 모의 (동일한 userDataDir로 새 StorageService 인스턴스 생성)
    const restartedStorage = new StorageService(tempDir);
    const loadedScripts = restartedStorage.getAllScripts();

    // Then: 3개의 스크립트가 모두 복원되어야 한다
    expect(loadedScripts.length).toBe(3);
    expect(loadedScripts.map((s) => s.title)).toContain('스크립트 1');
    expect(loadedScripts.map((s) => s.title)).toContain('스크립트 2');
    expect(loadedScripts.map((s) => s.title)).toContain('스크립트 3');
  });

  it('쓰기 권한이 없는 대상 경로에 내보내기 시도 시 안전하게 에러를 던져야 한다', () => {
    // Given: 유효한 스크립트
    const script = storage.saveScript({ title: '권한 테스트', content: '내용' });

    // When & Then: 존재하지 않는 루트 경로 또는 무효한 디렉터리에 내보내기 시도
    const invalidPath = path.join(tempDir, 'non_existent_folder_xyz', 'test.txt');
    expect(() => storage.exportScript(script.id, 'txt', invalidPath)).toThrow(/파일을 저장하지 못했어요/);
  });
});
