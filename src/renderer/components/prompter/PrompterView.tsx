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
  Subtitles,
  Sliders,
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
  const [bgOpacity, setBgOpacity] = useState<number>(1.0);
  const [isSubtitleMode, setIsSubtitleMode] = useState<boolean>(false);
  const [sentenceProgress, setSentenceProgress] = useState<number>(0);
  const subtitleElapsedRef = useRef<number>(0);

  // 음성 상태
  const [speechStatus, setSpeechStatus] = useState<'idle' | 'listening' | 'error'>('idle');
  const [audioLevel, setAudioLevel] = useState(0);
  const [lastSpokenText, setLastSpokenText] = useState('');
  const [speechErrorMessage, setSpeechErrorMessage] = useState<string | null>(null);

  const handleBgOpacityChange = useCallback((newOpacity: number) => {
    setBgOpacity(newOpacity);
    // OS 창 자체는 1.0 유지 (글자 앤티에일리어싱 흐려짐 방지), 배경만 투명해짐
    window.electronAPI?.setOpacity(1.0);
  }, []);

  const handleToggleSubtitleMode = useCallback(async () => {
    const next = !isSubtitleMode;
    setIsSubtitleMode(next);
    subtitleElapsedRef.current = 0;
    setSentenceProgress(0);
    await window.electronAPI?.setCompactMode(next);
  }, [isSubtitleMode]);

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
      backgroundColor: isSubtitleMode
        ? `rgba(15, 23, 42, ${bgOpacity})`
        : (bgOpacity < 1.0 ? `rgba(15, 23, 42, ${bgOpacity})` : 'var(--tds-bg-primary)'),
      backdropFilter: bgOpacity < 1.0 && bgOpacity > 0 ? 'blur(16px)' : 'none',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 1000,
      overflow: 'hidden',
    }}>
      {/* 1. 상단 헤더 제어 바 */}
      <header style={{
        height: isSubtitleMode ? '44px' : '52px',
        padding: isSubtitleMode ? '0 16px' : '0 20px',
        borderBottom: isSubtitleMode || bgOpacity < 1.0 ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid var(--tds-line-default)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: bgOpacity === 0
          ? 'rgba(15, 23, 42, 0.40)'
          : (isSubtitleMode || bgOpacity < 1.0 ? `rgba(15, 23, 42, ${Math.max(0.65, bgOpacity)})` : 'var(--tds-bg-primary)'),
        backdropFilter: bgOpacity < 1.0 ? 'blur(16px)' : 'none',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{
            fontWeight: 700,
            fontSize: isSubtitleMode ? '14px' : '16px',
            color: isSubtitleMode || bgOpacity < 1.0 ? '#F8FAFC' : 'inherit',
          }}>
            {script.title}
          </span>
          <span className="tds-caption" style={{ color: isSubtitleMode || bgOpacity < 1.0 ? '#94A3B8' : 'var(--tds-grey-500)' }}>
            문장 {currentSentenceIndex + 1} / {structuredData.allSentenceItems.length}
          </span>
        </div>

        {/* 모드 전환 셀렉터 */}
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            onClick={() => setScrollMode('voice')}
            style={{
              height: isSubtitleMode ? '28px' : '32px',
              padding: '0 10px',
              borderRadius: 'var(--tds-radius-full)',
              border: scrollMode === 'voice'
                ? '1.5px solid var(--tds-blue-500)'
                : (isSubtitleMode || bgOpacity < 1.0 ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid var(--tds-line-default)'),
              backgroundColor: scrollMode === 'voice' ? 'var(--tds-blue-50)' : 'transparent',
              color: scrollMode === 'voice' ? 'var(--tds-blue-600)' : (isSubtitleMode || bgOpacity < 1.0 ? '#CBD5E1' : 'var(--tds-fg-secondary)'),
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Mic size={13} />
            음성 스크롤
          </button>

          <button
            onClick={() => setScrollMode('constant')}
            style={{
              height: isSubtitleMode ? '28px' : '32px',
              padding: '0 10px',
              borderRadius: 'var(--tds-radius-full)',
              border: scrollMode === 'constant'
                ? '1.5px solid var(--tds-blue-500)'
                : (isSubtitleMode || bgOpacity < 1.0 ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid var(--tds-line-default)'),
              backgroundColor: scrollMode === 'constant' ? 'var(--tds-blue-50)' : 'transparent',
              color: scrollMode === 'constant' ? 'var(--tds-blue-600)' : (isSubtitleMode || bgOpacity < 1.0 ? '#CBD5E1' : 'var(--tds-fg-secondary)'),
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Play size={13} />
            일정 속도 ({wpm} WPM)
          </button>
        </div>

        {/* 우측 제어 도구 (배경 투명도, 자막 모드, 항상 위, 닫기) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* 배경 투명도 조절 프리셋 (스크립트는 100% 선명도 유지) */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: isSubtitleMode || bgOpacity < 1.0 ? 'rgba(255, 255, 255, 0.12)' : 'var(--tds-bg-secondary)',
            borderRadius: 'var(--tds-radius-m)',
            padding: '2px 4px',
            gap: '2px',
          }}>
            <Sliders size={12} style={{ color: isSubtitleMode || bgOpacity < 1.0 ? '#94A3B8' : 'var(--tds-grey-500)', marginLeft: '4px', marginRight: '2px' }} />
            {[
              { val: 1.0, label: '100%' },
              { val: 0.7, label: '70%' },
              { val: 0.35, label: '35%' },
              { val: 0.0, label: '투명' },
            ].map(({ val, label }) => (
              <button
                key={val}
                onClick={() => handleBgOpacityChange(val)}
                style={{
                  border: 'none',
                  background: bgOpacity === val ? 'var(--tds-blue-500)' : 'transparent',
                  color: bgOpacity === val ? '#FFFFFF' : (isSubtitleMode || bgOpacity < 1.0 ? '#CBD5E1' : 'var(--tds-grey-600)'),
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '2px 6px',
                  borderRadius: 'var(--tds-radius-s)',
                  cursor: 'pointer',
                  transition: 'all 120ms ease',
                }}
                title={`배경 투명도 ${label} (스크립트는 100% 선명도 유지)`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* 자막 전용 모드 토글 */}
          <TButton
            variant={isSubtitleMode ? 'primary' : 'secondary'}
            size="s"
            onClick={handleToggleSubtitleMode}
            icon={<Subtitles size={13} />}
          >
            {isSubtitleMode ? '전체 대본' : '자막 모드 (T)'}
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
              color: isSubtitleMode ? '#94A3B8' : 'var(--tds-grey-600)',
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

      {/* 2. 음성 인식 상태 인디케이터 바 */}
      {scrollMode === 'voice' && (
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

      {/* 3. 카운트다운 오버레이 */}
      {countdown !== null && (
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

      {/* 4. 중앙 뷰포트 (자막 모드 vs 일반 전체 스크롤 모드) */}
      {isSubtitleMode ? (
        /* 4-A. 자막 전용 모드 (Floating Subtitle Bar View) */
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '8px 24px',
          background: 'transparent',
          position: 'relative',
        }}>
          {/* 일정 속도 모드일 때 실시간 문장 진행률 바 */}
          {scrollMode === 'constant' && (
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '3px',
              backgroundColor: 'rgba(255, 255, 255, 0.12)',
            }}>
              <div style={{
                height: '100%',
                width: `${sentenceProgress}%`,
                backgroundColor: 'var(--tds-blue-500)',
                transition: 'width 80ms linear',
              }} />
            </div>
          )}

          {/* 현재 발화 문장 (100% 불투명 솔리드 + 스카이블루 + 짙은 그림자) */}
          <div style={{
            fontSize: '22px',
            fontWeight: 700,
            lineHeight: 1.45,
            textAlign: 'center',
            color: '#38BDF8',
            opacity: 1,
            textShadow: '0 2px 4px rgba(0, 0, 0, 0.95), 0 0 10px rgba(0, 0, 0, 0.9), 0 1px 2px #000000',
            marginBottom: '4px',
            maxWidth: '800px',
            wordBreak: 'keep-all',
          }}>
            {structuredData.allSentenceItems[currentSentenceIndex]?.sentence || '대본의 시작입니다.'}
          </div>

          {/* 다음 발화 문장 미리보기 */}
          <div
            onClick={() => {
              if (currentSentenceIndex + 1 < structuredData.allSentenceItems.length) {
                jumpToSentence(currentSentenceIndex + 1);
              }
            }}
            style={{
              fontSize: '14px',
              fontWeight: 500,
              lineHeight: 1.4,
              textAlign: 'center',
              color: 'rgba(255, 255, 255, 0.80)',
              opacity: 1,
              textShadow: '0 1px 3px rgba(0, 0, 0, 0.95), 0 0 6px rgba(0, 0, 0, 0.85)',
              maxWidth: '760px',
              wordBreak: 'keep-all',
              cursor: currentSentenceIndex + 1 < structuredData.allSentenceItems.length ? 'pointer' : 'default',
            }}
            title="클릭하여 다음 문장으로 이동"
          >
            {structuredData.allSentenceItems[currentSentenceIndex + 1]?.sentence
              ? `다음: ${structuredData.allSentenceItems[currentSentenceIndex + 1].sentence}`
              : '(대본의 마지막 문장입니다)'}
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
                        backgroundColor: isCurrent
                          ? (bgOpacity < 1.0 ? 'rgba(56, 189, 248, 0.25)' : 'var(--tds-blue-50, #E8F3FF)')
                          : 'transparent',
                        color: isCurrent
                          ? (bgOpacity < 1.0 ? '#38BDF8' : 'var(--tds-blue-600, #1B64DA)')
                          : isPast
                          ? (bgOpacity < 1.0 ? 'rgba(255, 255, 255, 0.55)' : 'var(--tds-grey-400, #B0B8C1)')
                          : (bgOpacity < 1.0 ? '#FFFFFF' : 'var(--tds-grey-900, #191F28)'),
                        textShadow: bgOpacity < 1.0
                          ? '0 1px 3px rgba(0, 0, 0, 0.95), 0 0 8px rgba(0, 0, 0, 0.85)'
                          : 'none',
                        opacity: 1,
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

      {/* 5. 하단 컨트롤 덱 (Floating Control Deck) */}
      <div style={{
        height: isSubtitleMode ? '48px' : '72px',
        padding: isSubtitleMode ? '0 20px' : '0 32px',
        backgroundColor: bgOpacity === 0
          ? 'rgba(15, 23, 42, 0.40)'
          : (isSubtitleMode || bgOpacity < 1.0 ? `rgba(15, 23, 42, ${Math.max(0.65, bgOpacity)})` : 'var(--tds-bg-primary)'),
        borderTop: isSubtitleMode || bgOpacity < 1.0 ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid var(--tds-line-default)',
        boxShadow: 'var(--tds-shadow-2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        zIndex: 20,
        backdropFilter: bgOpacity < 1.0 ? 'blur(16px)' : 'none',
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
            size={isSubtitleMode ? 's' : 'm'}
            onClick={handleClose}
          >
            연습 종료
          </TButton>
        </div>
      </div>
    </div>
  );
};
