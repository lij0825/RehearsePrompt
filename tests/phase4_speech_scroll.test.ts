import { describe, it, expect } from 'vitest';
import {
  estimateCurrentSentence,
  type SentenceItem,
} from '../src/renderer/services/speech/sentenceMatcher.ts';
import { SpeechService } from '../src/renderer/services/speech/speechService.ts';
import type { ISpeechRecognitionProvider } from '../src/renderer/services/speech/speechTypes.ts';

describe('PHASE 4: 음성 인식 기반 스크롤 및 문장 추정 테스트', () => {
  // 1. 한국어 테스트 문장 검증
  it('한국어 지정 문장의 완전 발화 및 부분 발화 위치를 정확히 추정해야 한다', () => {
    // Given: 한국어 대본 문장 목록 (사용자 지정 문장 포함)
    const sentences: SentenceItem[] = [
      { sentence: '면접관님 안녕하십니까. 백엔드 엔지니어 지원자입니다.', sentenceIndex: 0, paragraphIndex: 0 },
      { sentence: '안녕하세요. 저는 문제를 구조화하고 팀과 협업하면서 사용자에게 실제 가치를 전달하는 개발자입니다.', sentenceIndex: 1, paragraphIndex: 0 },
      { sentence: '학부 시절부터 대규모 분산 시스템 설계와 동시성 제어에 깊은 관심을 가져왔습니다.', sentenceIndex: 2, paragraphIndex: 1 },
      { sentence: '특히 데이터베이스 락 경합 문제를 큐 기반 비동기 파이프라인으로 해결한 경험이 있습니다.', sentenceIndex: 3, paragraphIndex: 1 },
    ];

    // When 1: 사용자가 정확한 전체 문장을 육성으로 낭독했을 때
    const spokenFull = '안녕하세요 저는 문제를 구조화하고 팀과 협업하면서 사용자에게 실제 가치를 전달하는 개발자입니다';
    const matchFull = estimateCurrentSentence(sentences, spokenFull, 0);

    // Then 1: 1번 문장으로 정확히 매칭되어야 한다
    expect(matchFull).not.toBeNull();
    expect(matchFull?.sentenceIndex).toBe(1);
    expect(matchFull?.confidence).toBeGreaterThan(0.7);

    // When 2: 발화 도중 앞부분만 먼저 인식되었을 때 (부분 발화)
    const spokenPartial = '문제를 구조화하고 팀과 협업하면서';
    const matchPartial = estimateCurrentSentence(sentences, spokenPartial, 0);

    // Then 2: 여전히 1번 문장을 높은 신뢰도로 타겟팅해야 한다
    expect(matchPartial).not.toBeNull();
    expect(matchPartial?.sentenceIndex).toBe(1);
    expect(matchPartial?.confidence).toBeGreaterThan(0.5);

    // When 3: 음성 인식 특성상 일부 조사가 변형되었을 때
    const spokenSlightVariance = '팀과 협업하며 실제 가치를 전하는 개발자입니다';
    const matchVariance = estimateCurrentSentence(sentences, spokenSlightVariance, 0);

    // Then 3: 1번 문장을 올바르게 추정해야 한다
    expect(matchVariance).not.toBeNull();
    expect(matchVariance?.sentenceIndex).toBe(1);
  });

  // 2. 영어 테스트 문장 검증
  it('영어 대본 문장의 발화 위치를 정확히 추정해야 한다', () => {
    // Given: 영어 대본 문장 목록
    const englishSentences: SentenceItem[] = [
      { sentence: 'Hello everyone, thank you for having me today.', sentenceIndex: 0, paragraphIndex: 0 },
      { sentence: 'I am a software engineer who structures complex problems and delivers real value to users.', sentenceIndex: 1, paragraphIndex: 0 },
      { sentence: 'In my previous project, I led the core infrastructure migration.', sentenceIndex: 2, paragraphIndex: 1 },
    ];

    // When: 영어 지정 문장 발화
    const spokenEnglish = 'I am a software engineer who structures complex problems and delivers real value to users';
    const match = estimateCurrentSentence(englishSentences, spokenEnglish, 0);

    // Then: 1번 문장과 일치해야 한다
    expect(match).not.toBeNull();
    expect(match?.sentenceIndex).toBe(1);
    expect(match?.confidence).toBeGreaterThan(0.75);

    // When: 영어 부분 발화
    const spokenEnglishPartial = 'delivers real value to users';
    const matchPartial = estimateCurrentSentence(englishSentences, spokenEnglishPartial, 1);
    expect(matchPartial?.sentenceIndex).toBe(1);
  });

  // 3. 한국어 + 영어 혼합 문장 검증
  it('한국어와 영어가 혼합된 전문 기술 대본의 발화 위치를 정확히 추정해야 한다', () => {
    // Given: 한영 혼합 대본
    const mixedSentences: SentenceItem[] = [
      { sentence: '지금부터 프론트엔드와 백엔드 최적화 성과를 말씀드리겠습니다.', sentenceIndex: 0, paragraphIndex: 0 },
      { sentence: '이번 스프린트에서는 React 컴포넌트의 Lifecycle을 최적화하고 Electron의 IPC 통신 성능을 개선했습니다.', sentenceIndex: 1, paragraphIndex: 0 },
      { sentence: '그 결과 렌더링 프레임 드롭을 방지하고 60fps 이상의 부드러운 스크롤을 달성했습니다.', sentenceIndex: 2, paragraphIndex: 1 },
    ];

    // When: 한영 혼용 발화 인식
    const spokenMixed = 'React 컴포넌트의 Lifecycle을 최적화하고 Electron의 IPC 통신 성능을 개선했습니다';
    const match = estimateCurrentSentence(mixedSentences, spokenMixed, 0);

    // Then: 외래어/영문이 포함되어도 1번 문장으로 정확히 매칭되어야 한다
    expect(match).not.toBeNull();
    expect(match?.sentenceIndex).toBe(1);
    expect(match?.confidence).toBeGreaterThan(0.65);
  });

  // 4. 오인식 및 엉뚱한 잡음 입력 시 방어 테스트
  it('대본과 전혀 무관한 잡음이나 엉뚱한 발화 시 잘못된 점프 없이 null을 반환해야 한다', () => {
    // Given: 면접 대본
    const sentences: SentenceItem[] = [
      { sentence: '안녕하세요. 지원자 홍길동입니다.', sentenceIndex: 0, paragraphIndex: 0 },
      { sentence: '팀과 협업하여 최상의 솔루션을 만듭니다.', sentenceIndex: 1, paragraphIndex: 0 },
    ];

    // When: 대본과 전혀 다른 엉뚱한 발화
    const unrelatedSpoken = '오늘 점심 메뉴는 돈까스랑 파스타를 먹을까요 날씨가 춥네요';
    const match = estimateCurrentSentence(sentences, unrelatedSpoken, 0);

    // Then: 일치율이 임계값을 넘지 못해 null을 반환해야 함
    expect(match).toBeNull();
  });

  // 5. 음성 서비스 프라이버시 및 네트워크 투명성 검증
  it('음성 엔진 정보가 네트워크 필요 여부 및 음성 미저장 원칙을 명시해야 한다', () => {
    const service = new SpeechService();
    const info = service.getEngineInfo();

    // Then: 투명성 고지 검증
    expect(info.requiresNetwork).toBe(true);
    expect(info.privacyNotice).toContain('음성 원본은 기기에 저장되거나 외부로 유출되지 않으며');
  });

  // 6. 모의 프로바이더를 통한 수동 위치 오버라이드 및 앵커 동기화 테스트
  it('사용자가 수동으로 위치를 변경하면 새로운 앵커 위치에서 음성 추적이 이어져야 한다', async () => {
    let capturedResult: string | null = null;
    let registeredCallback: ((text: string, isFinal: boolean) => void) | null = null;

    // Given: Mock 음성 프로바이더
    const mockProvider: ISpeechRecognitionProvider = {
      getEngineInfo: () => ({
        name: 'Mock Speech Provider',
        isLocal: true,
        requiresNetwork: false,
        privacyNotice: '테스트용',
      }),
      isSupported: () => true,
      requestPermission: async () => ({ granted: true }),
      start: async (options) => {
        registeredCallback = options.onResult;
      },
      stop: () => {},
      getAudioLevel: () => 45,
    };

    const service = new SpeechService(mockProvider);
    service.setScriptSentences([
      { sentence: '첫 번째 문장입니다.', sentenceIndex: 0, paragraphIndex: 0 },
      { sentence: '두 번째 문장입니다.', sentenceIndex: 1, paragraphIndex: 0 },
      { sentence: '세 번째 문장입니다.', sentenceIndex: 2, paragraphIndex: 1 },
      { sentence: '네 번째 문장입니다.', sentenceIndex: 3, paragraphIndex: 1 },
    ]);

    await service.startListening({
      onSentenceMatched: (match) => {
        capturedResult = match.matchedSentence;
      },
      onSpokenSnippet: () => {},
      onError: () => {},
    });

    // When 1: 첫 번째 문장 발화
    const invokeCallback = registeredCallback as unknown as ((text: string, isFinal: boolean) => void) | null;
    invokeCallback?.('첫 번째 문장입니다', true);
    expect(capturedResult).toBe('첫 번째 문장입니다.');

    // When 2: 사용자가 수동으로 3번 인덱스(네 번째 문장)로 수동 점프
    service.setAnchorSentenceIndex(3);

    // When 3: 네 번째 문장 발화 시 앵커 근처에서 즉시 추정
    invokeCallback?.('네 번째 문장입니다', true);
    expect(capturedResult).toBe('네 번째 문장입니다.');
  });
});
