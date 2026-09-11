import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import type { IScript, ScrollMode } from '../../../types/index.ts';
import { splitParagraphs, splitSentences } from '../../utils/textMetrics.ts';
import { SpeechService } from '../../services/speech/speechService.ts';
import type { SentenceItem } from '../../services/speech/sentenceMatcher.ts';
import { TButton } from '../common/TButton.tsx';
import {
  Mic,
  MicOff,
  Play,
  Pause,
  RotateCcw,
  ChevronUp,
  ChevronDown,
  X,
  Pin,
  HardDrive,
  Maximize2,
} from 'lucide-react';

/**
 * 문장 어절 및 글자 수와 WPM에 기반한 발화 소요 시간(초) 산출
 */
export function calculateSentenceDurationSec(sentence: string, wpm: number): number {
  const trimmed = sentence.trim();
  if (!trimmed) return 2.0;
  const words = trimmed.split(/\s+/).length;
  const chars = trimmed.length;
  const effectiveWords = Math.max(words, Math.ceil(chars / 4), 2);
  const safeWpm = Math.max(60, Math.min(240, wpm));
  return Math.max(1.8, (effectiveWords / safeWpm) * 60);
}

interface PrompterViewProps {
  script: IScript;
  onClose: () => void;
  isAlwaysOnTop: boolean;
  onToggleAlwaysOnTop: () => void;
}

export const PrompterView: React.FC<PrompterViewProps> = ({
  script,
  onClose,
  isAlwaysOnTop,
  onToggleAlwaysOnTop,
}) => {
  const [scrollMode, setScrollMode] = useState<ScrollMode>('voice');
  const [isPlaying, setIsPlaying] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(3);
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
  const [wpm, setWpm] = useState(130);
  const [isSubtitleMode, setIsSubtitleMode] = useState<boolean>(false);
  const [sentenceProgress, setSentenceProgress] = useState<number>(0);
  const subtitleElapsedRef = useRef<number>(0);

  // 음성 상태
  const [speechStatus, setSpeechStatus] = useState<'idle' | 'listening' | 'error'>('idle');
  const [audioLevel, setAudioLevel] = useState(0);
  const [lastSpokenText, setLastSpokenText] = useState('');
  const [speechErrorMessage, setSpeechErrorMessage] = useState<string | null>(null);

  const handleToggleSubtitleMode = useCallback(async () => {
    const next = !isSubtitleMode;
    setIsSubtitleMode(next);
    subtitleElapsedRef.current = 0;
    setSentenceProgress(0);
    await window.electronAPI?.setCompactMode(next);
  }, [isSubtitleMode]);

  // 일정 속도 모드 선택 및 즉시 재생 시작
  const handleSelectConstantMode = useCallback(() => {
    if (scrollMode === 'constant') {
      setIsPlaying((prev) => !prev);
    } else {
      setScrollMode('constant');
      setCountdown(null);
      setIsPlaying(true);
    }
  }, [scrollMode]);

  // 음성 스크롤 모드 선택
  const handleSelectVoiceMode = useCallback(() => {
    setScrollMode('voice');
    setCountdown(null);
    setIsPlaying(true);
  }, []);

  const containerRef = useRef<HTMLDivElement>(null);
  const sentenceRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const speechServiceRef = useRef<SpeechService | null>(null);
  const audioMeterIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const autoScrollRafRef = useRef<number | null>(null);
  const scrollPosRef = useRef<number>(0);
  const currentSentenceIndexRef = useRef<number>(0);

  // 대본 문단 및 문장 구조화
  const structuredData = useMemo(() => {
    const paragraphs = splitParagraphs(script.content);
    const allSentenceItems: SentenceItem[] = [];
    let globalIndex = 0;

    const renderedParagraphs = paragraphs.map((paraText, pIdx) => {
      const sentences = splitSentences(paraText);
      const items = sentences.map((sText) => {
        const item: SentenceItem = {
          sentence: sText,
          sentenceIndex: globalIndex++,
          paragraphIndex: pIdx,
        };
        allSentenceItems.push(item);
        return item;
      });
      return { paragraphIndex: pIdx, items };
    });

    return { allSentenceItems, renderedParagraphs };
  }, [script.content]);

  // SpeechService 초기화
  useEffect(() => {
    const service = new SpeechService();
    speechServiceRef.current = service;
    service.setScriptSentences(structuredData.allSentenceItems);

    return () => {
      service.stopListening();
    };
  }, [structuredData.allSentenceItems]);

  // 현재 문장 인덱스 ref 최신화
  useEffect(() => {
    currentSentenceIndexRef.current = currentSentenceIndex;
  }, [currentSentenceIndex]);

  // 문장으로 부드럽게 스크롤하는 함수 (상단 35% 시선 구역에 배치)
  const scrollToSentence = useCallback((index: number, smooth = true) => {
    const el = sentenceRefs.current[index];
    const container = containerRef.current;
    if (!el || !container) return;

    const containerRect = container.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();

    // 상단 35% 지점에 현재 문장이 오도록 계산
    const targetTop = elRect.top - containerRect.top + container.scrollTop - (containerRect.height * 0.35);
    const clampedTop = Math.max(0, targetTop);

    scrollPosRef.current = clampedTop;
    if (smooth) {
      container.scrollTo({
        top: clampedTop,
        behavior: 'smooth',
      });
    } else {
      container.scrollTop = clampedTop;
    }
  }, []);

  // 특정 문장으로 즉시 점프 및 위치 동기화 (사용자 클릭 또는 수동 내비게이션 시)
  const jumpToSentence = useCallback((index: number) => {
    setCurrentSentenceIndex(index);
    currentSentenceIndexRef.current = index;
    subtitleElapsedRef.current = 0;
    setSentenceProgress(0);
    scrollToSentence(index, false);
    if (scrollMode === 'voice') {
      speechServiceRef.current?.setAnchorSentenceIndex(index);
    }
  }, [scrollToSentence, scrollMode]);

  // 음성 인식 모드일 때 현재 문장 인덱스 변경 시 스크롤 이동
  useEffect(() => {
    if (countdown === null && scrollMode === 'voice') {
      scrollToSentence(currentSentenceIndex, true);
      speechServiceRef.current?.setAnchorSentenceIndex(currentSentenceIndex);
    }
  }, [currentSentenceIndex, countdown, scrollToSentence, scrollMode]);

  // 음성 인식 시작/정지 토글
  const startSpeechEngine = useCallback(async () => {
    const service = speechServiceRef.current;
    if (!service) return;

    setSpeechErrorMessage(null);
    const perm = await service.checkOrRequestPermission();
    if (!perm.granted) {
      setSpeechErrorMessage(perm.error || '마이크 권한이 필요해요.');
      setSpeechStatus('error');
      return;
    }

    try {
      await service.startListening({
        language: script.language || 'ko-KR',
        onSentenceMatched: (match) => {
          setCurrentSentenceIndex(match.sentenceIndex);
        },
        onSpokenSnippet: (snippet) => {
          setLastSpokenText(snippet);
        },
        onError: (err) => {
          setSpeechErrorMessage(err);
          setSpeechStatus('error');
        },
        onStatusChange: (status) => {
          setSpeechStatus(status === 'listening' ? 'listening' : 'idle');
        },
      });

      // 마이크 레벨 미터 폴링 (100ms)
      audioMeterIntervalRef.current = setInterval(() => {
        setAudioLevel(service.getAudioLevel());
      }, 100);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setSpeechErrorMessage(msg);
      setSpeechStatus('error');
    }
  }, [script.language]);

  const stopSpeechEngine = useCallback(() => {
    speechServiceRef.current?.stopListening();
    if (audioMeterIntervalRef.current) {
      clearInterval(audioMeterIntervalRef.current);
      audioMeterIntervalRef.current = null;
    }
    setAudioLevel(0);
    setSpeechStatus('idle');
  }, []);

  const handleClose = useCallback(async () => {
    if (isSubtitleMode) {
      await window.electronAPI?.setCompactMode(false);
    }
    stopSpeechEngine();
    onClose();
  }, [isSubtitleMode, stopSpeechEngine, onClose]);

  // 일정 속도 자동 스크롤 / 자막 모드 자동 진행 rAF 루프
  useEffect(() => {
    if (scrollMode === 'constant' && isPlaying && countdown === null) {
      let lastTime = performance.now();
      // 130 WPM 기준 초당 45px 스크롤 (WPM 비례)
      const pixelsPerSecond = (wpm / 130) * 45;

      // 스크롤 시작 시 컨테이너의 현재 위치로 초기화
      if (containerRef.current) {
        scrollPosRef.current = containerRef.current.scrollTop;
      }

      const step = (now: number) => {
        const delta = (now - lastTime) / 1000;
        lastTime = now;

        // 탭 전환 등 지연 시 급격한 점프 방지 (최대 100ms 캡)
        const safeDelta = Math.min(delta, 0.1);

        if (isSubtitleMode) {
          // 자막 모드: WPM 및 문장 길이에 기반한 자동 진행 엔진
          const currentItem = structuredData.allSentenceItems[currentSentenceIndexRef.current];
          const sentenceText = currentItem ? currentItem.sentence : '';
          const targetDuration = calculateSentenceDurationSec(sentenceText, wpm);

          subtitleElapsedRef.current += safeDelta;
          const ratio = Math.min(1.0, subtitleElapsedRef.current / targetDuration);
          setSentenceProgress(ratio * 100);

          if (subtitleElapsedRef.current >= targetDuration) {
            subtitleElapsedRef.current = 0;
            setSentenceProgress(0);
            const nextIndex = currentSentenceIndexRef.current + 1;
            if (nextIndex < structuredData.allSentenceItems.length) {
              currentSentenceIndexRef.current = nextIndex;
              setCurrentSentenceIndex(nextIndex);
            } else {
              // 대본 끝 도달 시 자동 정지
              setIsPlaying(false);
              return;
            }
          }
        } else if (containerRef.current) {
          const container = containerRef.current;

          // 사용자의 마우스 휠 또는 스크롤바 조작 감지 시 위치 재동기화
          if (Math.abs(container.scrollTop - scrollPosRef.current) > 6) {
            scrollPosRef.current = container.scrollTop;
          }

          // 부동소수점 누적 스크롤 적용 (정수 절사로 인한 정지 방지)
          scrollPosRef.current += pixelsPerSecond * safeDelta;
          container.scrollTop = scrollPosRef.current;

          // 대본 끝 도달 시 자동 정지
          const maxScroll = Math.max(0, container.scrollHeight - container.clientHeight);
          if (maxScroll > 0 && container.scrollTop >= maxScroll - 2) {
            setIsPlaying(false);
            return;
          }

          // 현재 화면 상단 35% 시선선에 위치한 문장을 찾아 하이라이트 동기화
          const containerRect = container.getBoundingClientRect();
          const targetY = containerRect.top + containerRect.height * 0.35;

          let matchedIndex = -1;
          for (let i = 0; i < sentenceRefs.current.length; i++) {
            const el = sentenceRefs.current[i];
            if (el) {
              const rect = el.getBoundingClientRect();
              if (rect.top <= targetY && rect.bottom >= targetY - 12) {
                matchedIndex = i;
                break;
              } else if (rect.top <= targetY) {
                matchedIndex = i;
              }
            }
          }

          if (matchedIndex !== -1 && matchedIndex !== currentSentenceIndexRef.current) {
            currentSentenceIndexRef.current = matchedIndex;
            setCurrentSentenceIndex(matchedIndex);
          }
        }

        autoScrollRafRef.current = requestAnimationFrame(step);
      };

      autoScrollRafRef.current = requestAnimationFrame(step);

      return () => {
        if (autoScrollRafRef.current) {
          cancelAnimationFrame(autoScrollRafRef.current);
          autoScrollRafRef.current = null;
        }
      };
    }
  }, [scrollMode, isPlaying, countdown, wpm, isSubtitleMode, structuredData.allSentenceItems]);

  // 카운트다운 타이머
  useEffect(() => {
    if (countdown !== null && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown((prev) => {
          if (prev !== null && prev > 1) {
            return prev - 1;
          }
          // 3, 2, 1 카운트다운 완료 시 자동 재생 시작
          setIsPlaying(true);
          return null;
        });
      }, 1000);
      return () => clearTimeout(timer);
    } else if (countdown === null && isPlaying) {
      if (scrollMode === 'voice') {
        startSpeechEngine();
      }
    }
  }, [countdown, isPlaying, scrollMode, startSpeechEngine]);

  // 모드 변경 시 엔진 전환
  useEffect(() => {
    if (scrollMode === 'voice') {
      if (isPlaying && countdown === null) {
        startSpeechEngine();
      }
    } else {
      stopSpeechEngine();
    }
  }, [scrollMode, isPlaying, countdown, startSpeechEngine, stopSpeechEngine]);

  // 처음으로 되감기
  const handleResetTop = useCallback(() => {
    setCurrentSentenceIndex(0);
    currentSentenceIndexRef.current = 0;
    subtitleElapsedRef.current = 0;
    setSentenceProgress(0);
    scrollPosRef.current = 0;
    if (containerRef.current) {
      containerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
    if (scrollMode === 'voice') {
      speechServiceRef.current?.setAnchorSentenceIndex(0);
    }
  }, [scrollMode]);

  // 일시정지 / 재생 토글
  const togglePlay = useCallback(() => {
    setIsPlaying((prev) => {
      const next = !prev;
      if (next) {
        if (isSubtitleMode) {
          if (currentSentenceIndexRef.current >= structuredData.allSentenceItems.length - 1) {
            handleResetTop();
          }
        } else if (containerRef.current) {
          const maxScroll = Math.max(0, containerRef.current.scrollHeight - containerRef.current.clientHeight);
          if (maxScroll > 0 && containerRef.current.scrollTop >= maxScroll - 5) {
            handleResetTop();
          }
        }
      }
      if (!next) {
        stopSpeechEngine();
      }
      return next;
    });
  }, [handleResetTop, isSubtitleMode, structuredData.allSentenceItems.length, stopSpeechEngine]);

  // 문단 이동
  const handlePrevParagraph = useCallback(() => {
    const currentItem = structuredData.allSentenceItems[currentSentenceIndexRef.current];
    if (!currentItem) return;
    const targetParaIdx = Math.max(0, currentItem.paragraphIndex - 1);
    const targetSentence = structuredData.allSentenceItems.find((it) => it.paragraphIndex === targetParaIdx);
    if (targetSentence) {
      jumpToSentence(targetSentence.sentenceIndex);
    }
  }, [structuredData.allSentenceItems, jumpToSentence]);

  const handleNextParagraph = useCallback(() => {
    const currentItem = structuredData.allSentenceItems[currentSentenceIndexRef.current];
    if (!currentItem) return;
    const targetParaIdx = Math.min(structuredData.renderedParagraphs.length - 1, currentItem.paragraphIndex + 1);
    const targetSentence = structuredData.allSentenceItems.find((it) => it.paragraphIndex === targetParaIdx);
    if (targetSentence) {
      jumpToSentence(targetSentence.sentenceIndex);
    }
  }, [structuredData.allSentenceItems, structuredData.renderedParagraphs.length, jumpToSentence]);

  // 키보드 조작 (Space, Esc, 방향키, T)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.code === 'Escape') {
        e.preventDefault();
        handleClose();
      } else if (e.code === 'KeyT') {
        e.preventDefault();
        handleToggleSubtitleMode();
      } else if (e.code === 'ArrowUp') {
        e.preventDefault();
        const prevIdx = Math.max(0, currentSentenceIndexRef.current - 1);
        jumpToSentence(prevIdx);
      } else if (e.code === 'ArrowDown') {
        e.preventDefault();
        const nextIdx = Math.min(structuredData.allSentenceItems.length - 1, currentSentenceIndexRef.current + 1);
        jumpToSentence(nextIdx);
      } else if (e.key === ']' || e.key === '}') {
        e.preventDefault();
        setWpm((prev) => Math.min(240, prev + 10));
      } else if (e.key === '[' || e.key === '{') {
        e.preventDefault();
        setWpm((prev) => Math.max(60, prev - 10));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, handleClose, handleToggleSubtitleMode, jumpToSentence, structuredData.allSentenceItems.length]);

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: isSubtitleMode ? '#0F172A' : 'var(--tds-bg-primary)',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 1000,
      overflow: 'hidden',
    }}>
      {/* 1. 상단 헤더 제어 바 (일반 전체 프롬프터 모드 전용) */}
      {!isSubtitleMode && (
        <header style={{
          height: '52px',
          padding: '0 20px',
          borderBottom: '1px solid var(--tds-line-default)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: 'var(--tds-bg-primary)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontWeight: 700, fontSize: '16px' }}>
              {script.title}
            </span>
            <span className="tds-caption" style={{ color: 'var(--tds-grey-500)' }}>
              문장 {currentSentenceIndex + 1} / {structuredData.allSentenceItems.length}
            </span>
          </div>

          {/* 모드 전환 셀렉터 */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleSelectVoiceMode}
              style={{
                height: '32px',
                padding: '0 12px',
                borderRadius: 'var(--tds-radius-full)',
                border: scrollMode === 'voice'
                  ? '1.5px solid var(--tds-blue-500)'
                  : '1px solid var(--tds-line-default)',
                backgroundColor: scrollMode === 'voice' ? 'var(--tds-blue-50)' : 'transparent',
                color: scrollMode === 'voice' ? 'var(--tds-blue-600)' : 'var(--tds-fg-secondary)',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Mic size={14} />
              음성 스크롤
            </button>

            <button
              onClick={handleSelectConstantMode}
              style={{
                height: '32px',
                padding: '0 12px',
                borderRadius: 'var(--tds-radius-full)',
                border: scrollMode === 'constant'
                  ? '1.5px solid var(--tds-blue-500)'
                  : '1px solid var(--tds-line-default)',
                backgroundColor: scrollMode === 'constant' ? 'var(--tds-blue-50)' : 'transparent',
                color: scrollMode === 'constant' ? 'var(--tds-blue-600)' : 'var(--tds-fg-secondary)',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
              title="일정 속도로 스크롤 시작/정지"
            >
              <Play size={14} />
              일정 속도 ({wpm} WPM)
            </button>
          </div>

          {/* 우측 제어 도구 (글자만 최상단 띄우기, 항상 위, 닫기) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* 글자만 최상단에 띄우기 버튼 */}
            <TButton
              variant="secondary"
              size="s"
              onClick={handleToggleSubtitleMode}
              title="웹캠 바로 아래에 글자만 컴팩트하게 띄웁니다 (T)"
            >
              📌 글자만 최상단에 띄우기 (T)
            </TButton>

            {/* 항상 위 토글 */}
            <TButton
              variant={isAlwaysOnTop ? 'primary' : 'secondary'}
              size="s"
              onClick={onToggleAlwaysOnTop}
              icon={<Pin size={13} />}
            >
              {isAlwaysOnTop ? '항상 위' : '항상 위 끔'}
            </TButton>

            {/* 종료 버튼 */}
            <button
              onClick={handleClose}
              style={{
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                color: 'var(--tds-grey-600)',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
              }}
              title="연습 종료 (ESC)"
            >
              <X size={16} />
            </button>
          </div>
        </header>
      )}

      {/* 2. 음성 인식 상태 인디케이터 바 (일반 모드 전용) */}
      {!isSubtitleMode && scrollMode === 'voice' && (
        <div style={{
          backgroundColor: isSubtitleMode ? 'rgba(30, 41, 59, 0.9)' : 'var(--tds-bg-secondary)',
          padding: '6px 20px',
          borderBottom: isSubtitleMode ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid var(--tds-line-default)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '12px',
        }}>
          {/* 좌측: 마이크 상태 및 dB 레벨 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {speechStatus === 'listening' ? (
                <span style={{ color: 'var(--tds-blue-500)', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                  <Mic size={14} /> 음성을 듣고 있어요
                </span>
              ) : speechStatus === 'error' ? (
                <span style={{ color: 'var(--tds-red-500)', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                  <MicOff size={14} /> 마이크 오류
                </span>
              ) : (
                <span style={{ color: isSubtitleMode ? '#94A3B8' : 'var(--tds-grey-500)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <MicOff size={14} /> 대기 중
                </span>
              )}
            </div>

            {/* 실시간 마이크 볼륨 레벨 바 */}
            <div style={{
              width: '70px',
              height: '5px',
              backgroundColor: isSubtitleMode ? 'rgba(255, 255, 255, 0.15)' : 'var(--tds-grey-200)',
              borderRadius: 'var(--tds-radius-full)',
              overflow: 'hidden',
            }}>
              <div style={{
                width: `${audioLevel}%`,
                height: '100%',
                backgroundColor: audioLevel > 15 ? 'var(--tds-blue-500)' : (isSubtitleMode ? '#64748B' : 'var(--tds-grey-400)'),
                transition: 'width 80ms ease',
              }} />
            </div>

            {/* 마지막 인식된 발화 어절 */}
            {lastSpokenText && (
              <span className="tds-caption" style={{
                color: isSubtitleMode ? '#94A3B8' : 'var(--tds-grey-600)',
                maxWidth: '260px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                최근 발화: &quot;{lastSpokenText}&quot;
              </span>
            )}

            {speechErrorMessage && (
              <span className="tds-caption" style={{ color: 'var(--tds-red-500)', fontWeight: 600 }}>
                {speechErrorMessage}
              </span>
            )}
          </div>

          {/* 우측: 로컬 프라이버시 배지 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="tds-caption" style={{
              backgroundColor: isSubtitleMode ? 'rgba(255, 255, 255, 0.08)' : 'var(--tds-grey-100)',
              color: isSubtitleMode ? '#94A3B8' : 'var(--tds-grey-700)',
              padding: '2px 8px',
              borderRadius: 'var(--tds-radius-s)',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}>
              <HardDrive size={11} /> 100% 온디바이스
            </span>
          </div>
        </div>
      )}

      {/* 3. 카운트다운 오버레이 (일반 모드 전용) */}
      {!isSubtitleMode && countdown !== null && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: isSubtitleMode ? 'rgba(15, 23, 42, 0.92)' : 'rgba(255, 255, 255, 0.92)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 500,
        }}>
          <div style={{
            fontSize: isSubtitleMode ? '64px' : '96px',
            fontWeight: 800,
            color: 'var(--tds-blue-500)',
            marginBottom: '12px',
          }}>
            {countdown}
          </div>
          <div className="tds-h3" style={{ color: isSubtitleMode ? '#F8FAFC' : 'var(--tds-grey-700)' }}>
            곧 연습이 시작돼요
          </div>
          <p className="tds-body-2" style={{ color: isSubtitleMode ? '#94A3B8' : 'var(--tds-grey-500)', marginTop: '6px' }}>
            웹캠 렌즈를 편안하게 응시해 주세요.
          </p>
        </div>
      )}

      {/* 4. 중앙 뷰포트 (상단 글자 전용 플로팅 모드 vs 일반 전체 스크롤 모드) */}
      {isSubtitleMode ? (
        /* 4-A. 상단 글자 전용 플로팅 뷰 (Floating HUD Bar View) - 단일 일체형 (잘림 방지) */
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#0F172A',
          color: '#FFFFFF',
          padding: '8px 16px',
          justifyContent: 'space-between',
          userSelect: 'none',
          height: '100%',
          boxSizing: 'border-box',
        }}>
          {/* 상단 미니 바: 진행률 바 + 타이틀 + 모드 토글 + 복원/닫기 */}
          <div>
            {scrollMode === 'constant' && (
              <div style={{
                width: '100%',
                height: '3px',
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                borderRadius: '2px',
                overflow: 'hidden',
                marginBottom: '6px',
              }}>
                <div style={{
                  height: '100%',
                  width: `${sentenceProgress}%`,
                  backgroundColor: '#38BDF8',
                  transition: 'width 80ms linear',
                }} />
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontWeight: 700, fontSize: '13px', color: '#F8FAFC' }}>
                  {script.title}
                </span>
                <span style={{ fontSize: '11px', color: '#94A3B8' }}>
                  {currentSentenceIndex + 1} / {structuredData.allSentenceItems.length}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  onClick={handleSelectVoiceMode}
                  style={{
                    padding: '2px 8px',
                    borderRadius: 'var(--tds-radius-full)',
                    border: scrollMode === 'voice' ? '1px solid var(--tds-blue-500)' : '1px solid rgba(255, 255, 255, 0.2)',
                    backgroundColor: scrollMode === 'voice' ? 'rgba(56, 189, 248, 0.2)' : 'transparent',
                    color: scrollMode === 'voice' ? '#38BDF8' : '#94A3B8',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  🎙️ 음성
                </button>
                <button
                  onClick={handleSelectConstantMode}
                  style={{
                    padding: '2px 8px',
                    borderRadius: 'var(--tds-radius-full)',
                    border: scrollMode === 'constant' ? '1px solid var(--tds-blue-500)' : '1px solid rgba(255, 255, 255, 0.2)',
                    backgroundColor: scrollMode === 'constant' ? 'rgba(56, 189, 248, 0.2)' : 'transparent',
                    color: scrollMode === 'constant' ? '#38BDF8' : '#94A3B8',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                  title="일정 속도로 시작/일시정지"
                >
                  ⏱️ 일정속도
                </button>
                <button
                  onClick={handleToggleSubtitleMode}
                  style={{
                    padding: '2px 8px',
                    borderRadius: '6px',
                    border: '1px solid rgba(255, 255, 255, 0.25)',
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    color: '#F8FAFC',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                  title="전체 화면 텔레프롬프터로 복원 (T)"
                >
                  <Maximize2 size={11} /> 전체 화면 복원
                </button>
                <button
                  onClick={handleClose}
                  style={{
                    border: 'none',
                    background: 'none',
                    color: '#94A3B8',
                    cursor: 'pointer',
                    padding: '2px',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                  title="연습 종료"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          </div>

          {/* 중앙 대본 텍스트 및 이동 */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            margin: '4px 0',
          }}>
            <button
              onClick={() => jumpToSentence(Math.max(0, currentSentenceIndexRef.current - 1))}
              disabled={currentSentenceIndex <= 0}
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '6px',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                color: '#FFFFFF',
                cursor: currentSentenceIndex <= 0 ? 'not-allowed' : 'pointer',
                opacity: currentSentenceIndex <= 0 ? 0.3 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
              title="이전 문장 (↑)"
            >
              <ChevronUp size={14} />
            </button>

            <div style={{ flex: 1, textAlign: 'center', overflow: 'hidden' }}>
              <div style={{
                fontSize: '19px',
                fontWeight: 800,
                lineHeight: 1.35,
                color: '#38BDF8',
                wordBreak: 'keep-all',
                textShadow: '0 2px 8px rgba(0, 0, 0, 0.5)',
              }}>
                {structuredData.allSentenceItems[currentSentenceIndex]?.sentence || '대본의 시작입니다.'}
              </div>
              {structuredData.allSentenceItems[currentSentenceIndex + 1]?.sentence && (
                <div
                  onClick={() => jumpToSentence(currentSentenceIndex + 1)}
                  style={{
                    fontSize: '12px',
                    fontWeight: 500,
                    color: 'rgba(255, 255, 255, 0.60)',
                    marginTop: '2px',
                    wordBreak: 'keep-all',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                  title="클릭하여 다음 문장으로 이동"
                >
                  다음: {structuredData.allSentenceItems[currentSentenceIndex + 1].sentence}
                </div>
              )}
            </div>

            <button
              onClick={() => jumpToSentence(Math.min(structuredData.allSentenceItems.length - 1, currentSentenceIndexRef.current + 1))}
              disabled={currentSentenceIndex >= structuredData.allSentenceItems.length - 1}
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '6px',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                color: '#FFFFFF',
                cursor: currentSentenceIndex >= structuredData.allSentenceItems.length - 1 ? 'not-allowed' : 'pointer',
                opacity: currentSentenceIndex >= structuredData.allSentenceItems.length - 1 ? 0.3 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
              title="다음 문장 (↓)"
            >
              <ChevronDown size={14} />
            </button>
          </div>

          {/* 하단 컨트롤: 처음으로, 재생/일시정지 CTA, WPM 조절 */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            paddingTop: '4px',
          }}>
            <button
              onClick={handleResetTop}
              style={{
                border: 'none',
                background: 'rgba(255, 255, 255, 0.08)',
                color: '#94A3B8',
                borderRadius: '4px',
                padding: '3px 8px',
                fontSize: '11px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <RotateCcw size={11} /> 처음으로
            </button>

            {/* 핵심 재생 / 일시정지 버튼 */}
            <button
              onClick={togglePlay}
              style={{
                backgroundColor: isPlaying ? 'rgba(255, 255, 255, 0.15)' : 'var(--tds-blue-500)',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '6px',
                padding: '4px 16px',
                fontWeight: 700,
                fontSize: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              {isPlaying ? <Pause size={12} /> : <Play size={12} />}
              {isPlaying ? '일시정지 (Space)' : '진행 시작 (Space)'}
            </button>

            {scrollMode === 'constant' ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <button
                  onClick={() => setWpm((prev) => Math.max(60, prev - 10))}
                  style={{
                    border: 'none',
                    background: 'rgba(255, 255, 255, 0.1)',
                    color: '#FFFFFF',
                    width: '20px',
                    height: '20px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: 700,
                    fontSize: '12px',
                  }}
                >
                  -
                </button>
                <span style={{ fontSize: '11px', fontWeight: 700, minWidth: '50px', textAlign: 'center' }}>
                  {wpm} WPM
                </span>
                <button
                  onClick={() => setWpm((prev) => Math.min(240, prev + 10))}
                  style={{
                    border: 'none',
                    background: 'rgba(255, 255, 255, 0.1)',
                    color: '#FFFFFF',
                    width: '20px',
                    height: '20px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: 700,
                    fontSize: '12px',
                  }}
                >
                  +
                </button>
              </div>
            ) : (
              <span style={{ fontSize: '11px', color: '#94A3B8' }}>
                {speechStatus === 'listening' ? '🎙️ 음성 듣는 중' : '대기 중'}
              </span>
            )}
          </div>
        </div>
      ) : (
        /* 4-B. 일반 전체 스크롤 모드 (Full Teleprompter View) */
        <div style={{ position: 'relative', flex: 1, overflow: 'hidden' }}>
          {/* 상단 35% 시선 고정 아이콘택트 밴드 */}
          <div style={{
            position: 'absolute',
            top: '35%',
            left: 0,
            right: 0,
            height: '2px',
            backgroundColor: 'rgba(49, 130, 246, 0.25)',
            pointerEvents: 'none',
            zIndex: 10,
          }}>
            <span style={{
              position: 'absolute',
              right: '24px',
              top: '-20px',
              fontSize: '11px',
              fontWeight: 600,
              color: 'var(--tds-blue-500)',
              backgroundColor: 'var(--tds-blue-50)',
              padding: '2px 8px',
              borderRadius: 'var(--tds-radius-s)',
            }}>
              👁️ 카메라 시선 고정 라인
            </span>
          </div>

          {/* 스크롤 가능한 본문 컨테이너 */}
          <div
            ref={containerRef}
            style={{
              height: '100%',
              overflowY: 'auto',
              padding: '160px 48px 300px 48px',
              maxWidth: '860px',
              margin: '0 auto',
            }}
          >
            {structuredData.renderedParagraphs.map((para) => (
              <div
                key={para.paragraphIndex}
                style={{
                  marginBottom: '36px',
                  lineHeight: 1.85,
                  fontSize: '24px',
                  fontWeight: 500,
                }}
              >
                {para.items.map((item) => {
                  const isCurrent = item.sentenceIndex === currentSentenceIndex;
                  const isPast = item.sentenceIndex < currentSentenceIndex;

                  return (
                    <span
                      key={item.sentenceIndex}
                      ref={(el) => { sentenceRefs.current[item.sentenceIndex] = el; }}
                      onClick={() => {
                        jumpToSentence(item.sentenceIndex);
                      }}
                      style={{
                        display: 'inline',
                        padding: '2px 4px',
                        borderRadius: 'var(--tds-radius-s)',
                        backgroundColor: isCurrent ? 'var(--tds-blue-50, #E8F3FF)' : 'transparent',
                        color: isCurrent
                          ? 'var(--tds-blue-600, #1B64DA)'
                          : isPast
                          ? 'var(--tds-grey-400, #B0B8C1)'
                          : 'var(--tds-grey-900, #191F28)',
                        fontWeight: isCurrent ? 700 : 500,
                        cursor: 'pointer',
                        transition: 'all 120ms ease',
                      }}
                      title="클릭하여 이 문장으로 이동"
                    >
                      {item.sentence}{' '}
                    </span>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. 하단 컨트롤 덱 (일반 전체 프롬프터 모드 전용) */}
      {!isSubtitleMode && (
        <div style={{
          height: '72px',
          padding: '0 32px',
          backgroundColor: 'var(--tds-bg-primary)',
          borderTop: '1px solid var(--tds-line-default)',
          boxShadow: 'var(--tds-shadow-2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 20,
        }}>
        {/* 좌측 이동 제어 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <TButton
            variant="secondary"
            size={isSubtitleMode ? 's' : 'm'}
            onClick={handleResetTop}
            icon={<RotateCcw size={isSubtitleMode ? 13 : 16} />}
          >
            처음으로
          </TButton>
          <TButton
            variant="secondary"
            size={isSubtitleMode ? 's' : 'm'}
            onClick={isSubtitleMode
              ? () => jumpToSentence(Math.max(0, currentSentenceIndexRef.current - 1))
              : handlePrevParagraph}
            icon={<ChevronUp size={isSubtitleMode ? 13 : 16} />}
          >
            {isSubtitleMode ? '이전 문장' : '이전 문단'}
          </TButton>
          <TButton
            variant="secondary"
            size={isSubtitleMode ? 's' : 'm'}
            onClick={isSubtitleMode
              ? () => jumpToSentence(Math.min(structuredData.allSentenceItems.length - 1, currentSentenceIndexRef.current + 1))
              : handleNextParagraph}
            icon={<ChevronDown size={isSubtitleMode ? 13 : 16} />}
          >
            {isSubtitleMode ? '다음 문장' : '다음 문단'}
          </TButton>
        </div>

        {/* 중앙: 재생 / 일시정지 CTA (Space) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <TButton
            variant="primary"
            size={isSubtitleMode ? 'm' : 'l'}
            onClick={togglePlay}
            icon={isPlaying ? <Pause size={isSubtitleMode ? 15 : 18} /> : <Play size={isSubtitleMode ? 15 : 18} />}
            style={{ width: isSubtitleMode ? '130px' : '160px' }}
          >
            {isPlaying ? '일시정지 (Space)' : '재생 (Space)'}
          </TButton>
        </div>

        {/* 우측: WPM 속도 조절 & 종료 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {scrollMode === 'constant' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <button
                onClick={() => setWpm((prev) => Math.max(60, prev - 10))}
                style={{
                  width: isSubtitleMode ? '28px' : '32px',
                  height: isSubtitleMode ? '28px' : '32px',
                  borderRadius: 'var(--tds-radius-m)',
                  border: isSubtitleMode ? '1px solid rgba(255, 255, 255, 0.2)' : '1px solid var(--tds-line-default)',
                  background: 'none',
                  color: isSubtitleMode ? '#F8FAFC' : 'inherit',
                  cursor: 'pointer',
                  fontWeight: 700,
                }}
              >
                -
              </button>
              <span className="tds-tabular" style={{
                fontWeight: 700,
                fontSize: isSubtitleMode ? '13px' : '15px',
                width: isSubtitleMode ? '60px' : '70px',
                textAlign: 'center',
                color: isSubtitleMode ? '#F8FAFC' : 'inherit',
              }}>
                {wpm} WPM
              </span>
              <button
                onClick={() => setWpm((prev) => Math.min(240, prev + 10))}
                style={{
                  width: isSubtitleMode ? '28px' : '32px',
                  height: isSubtitleMode ? '28px' : '32px',
                  borderRadius: 'var(--tds-radius-m)',
                  border: isSubtitleMode ? '1px solid rgba(255, 255, 255, 0.2)' : '1px solid var(--tds-line-default)',
                  background: 'none',
                  color: isSubtitleMode ? '#F8FAFC' : 'inherit',
                  cursor: 'pointer',
                  fontWeight: 700,
                }}
              >
                +
              </button>
            </div>
          )}

            <TButton
              variant="ghost"
              size="m"
              onClick={handleClose}
            >
              연습 종료
            </TButton>
          </div>
        </div>
      )}
    </div>
  );
};
