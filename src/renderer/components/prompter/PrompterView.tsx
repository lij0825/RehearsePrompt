import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import type { IScript, ScrollMode } from '../../../types/index.ts';
import { splitParagraphs, splitSentences } from '../../utils/textMetrics.ts';
import { SpeechService } from '../../services/speech/speechService.ts';
import type { SentenceItem } from '../../services/speech/sentenceMatcher.ts';
import { TButton } from '../common/TButton.tsx';
import {
  ShieldAlert,
  Mic,
  MicOff,
  Play,
  Pause,
  RotateCcw,
  ChevronUp,
  ChevronDown,
  X,
  Pin,
  Wifi,
  HardDrive,
} from 'lucide-react';

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

  // 음성 상태
  const [speechStatus, setSpeechStatus] = useState<'idle' | 'listening' | 'error'>('idle');
  const [audioLevel, setAudioLevel] = useState(0);
  const [lastSpokenText, setLastSpokenText] = useState('');
  const [speechErrorMessage, setSpeechErrorMessage] = useState<string | null>(null);

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

  // 일정 속도 자동 스크롤 rAF 루프
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

        if (containerRef.current) {
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
  }, [scrollMode, isPlaying, countdown, wpm]);

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
      if (next && containerRef.current) {
        const maxScroll = Math.max(0, containerRef.current.scrollHeight - containerRef.current.clientHeight);
        if (maxScroll > 0 && containerRef.current.scrollTop >= maxScroll - 5) {
          handleResetTop();
        }
      }
      if (!next) {
        stopSpeechEngine();
      }
      return next;
    });
  }, [handleResetTop, stopSpeechEngine]);

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

  // 키보드 조작 (Space, Esc, 방향키)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.code === 'Escape') {
        e.preventDefault();
        stopSpeechEngine();
        onClose();
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
  }, [togglePlay, onClose, stopSpeechEngine, jumpToSentence, structuredData.allSentenceItems.length]);

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'var(--tds-bg-primary)',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 1000,
      overflow: 'hidden',
    }}>
      {/* 1. 상단 화면 공유 투명성 주의 배너 */}
      <div style={{
        backgroundColor: 'var(--tds-blue-50)',
        color: 'var(--tds-blue-600)',
        padding: '6px 16px',
        fontSize: '12px',
        fontWeight: 600,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid var(--tds-grey-200)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShieldAlert size={14} />
          <span>안내: RehearsePrompt는 일반 창으로 작동하며, 화면 공유 시 상대방에게 노출됩니다.</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="tds-caption" style={{ color: 'var(--tds-grey-500)' }}>종료: ESC</span>
          <button
            onClick={() => { stopSpeechEngine(); onClose(); }}
            style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--tds-grey-700)' }}
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* 2. 상단 헤더 제어 바 */}
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
          <span style={{ fontWeight: 700, fontSize: '16px' }}>{script.title}</span>
          <span className="tds-caption" style={{ color: 'var(--tds-grey-500)' }}>
            문장 {currentSentenceIndex + 1} / {structuredData.allSentenceItems.length}
          </span>
        </div>

        {/* 모드 전환 셀렉터 */}
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            onClick={() => setScrollMode('voice')}
            style={{
              height: '32px',
              padding: '0 12px',
              borderRadius: 'var(--tds-radius-full)',
              border: scrollMode === 'voice' ? '1.5px solid var(--tds-blue-500)' : '1px solid var(--tds-line-default)',
              backgroundColor: scrollMode === 'voice' ? 'var(--tds-blue-50)' : 'transparent',
              color: scrollMode === 'voice' ? 'var(--tds-blue-600)' : 'var(--tds-fg-secondary)',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Mic size={14} />
            음성 인식 스크롤
          </button>

          <button
            onClick={() => setScrollMode('constant')}
            style={{
              height: '32px',
              padding: '0 12px',
              borderRadius: 'var(--tds-radius-full)',
              border: scrollMode === 'constant' ? '1.5px solid var(--tds-blue-500)' : '1px solid var(--tds-line-default)',
              backgroundColor: scrollMode === 'constant' ? 'var(--tds-blue-50)' : 'transparent',
              color: scrollMode === 'constant' ? 'var(--tds-blue-600)' : 'var(--tds-fg-secondary)',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Play size={14} />
            일정 속도 ({wpm} WPM)
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <TButton
            variant={isAlwaysOnTop ? 'primary' : 'secondary'}
            size="s"
            onClick={onToggleAlwaysOnTop}
            icon={<Pin size={14} />}
          >
            {isAlwaysOnTop ? '항상 위 켜짐' : '항상 위'}
          </TButton>
        </div>
      </header>

      {/* 3. 음성 인식 상태 인디케이터 바 */}
      {scrollMode === 'voice' && (
        <div style={{
          backgroundColor: 'var(--tds-bg-secondary)',
          padding: '8px 24px',
          borderBottom: '1px solid var(--tds-line-default)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '13px',
        }}>
          {/* 좌측: 마이크 상태 및 dB 레벨 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {speechStatus === 'listening' ? (
                <span style={{ color: 'var(--tds-blue-500)', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                  <Mic size={15} /> 음성을 듣고 있어요
                </span>
              ) : speechStatus === 'error' ? (
                <span style={{ color: 'var(--tds-red-500)', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                  <MicOff size={15} /> 마이크 오류
                </span>
              ) : (
                <span style={{ color: 'var(--tds-grey-500)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <MicOff size={15} /> 대기 중
                </span>
              )}
            </div>

            {/* 실시간 마이크 볼륨 레벨 바 */}
            <div style={{
              width: '80px',
              height: '6px',
              backgroundColor: 'var(--tds-grey-200)',
              borderRadius: 'var(--tds-radius-full)',
              overflow: 'hidden',
            }}>
              <div style={{
                width: `${audioLevel}%`,
                height: '100%',
                backgroundColor: audioLevel > 15 ? 'var(--tds-blue-500)' : 'var(--tds-grey-400)',
                transition: 'width 80ms ease',
              }} />
            </div>

            {/* 마지막 인식된 발화 어절 */}
            {lastSpokenText && (
              <span className="tds-caption" style={{ color: 'var(--tds-grey-600)', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                최근 발화: &quot;{lastSpokenText}&quot;
              </span>
            )}

            {speechErrorMessage && (
              <span className="tds-caption" style={{ color: 'var(--tds-red-500)', fontWeight: 600 }}>
                {speechErrorMessage}
              </span>
            )}
          </div>

          {/* 우측: 프라이버시 및 네트워크 투명성 배지 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="tds-caption" style={{
              backgroundColor: 'var(--tds-blue-50)',
              color: 'var(--tds-blue-600)',
              padding: '2px 8px',
              borderRadius: 'var(--tds-radius-s)',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}>
              <Wifi size={12} /> 네트워크 사용
            </span>
            <span className="tds-caption" style={{
              backgroundColor: 'var(--tds-grey-100)',
              color: 'var(--tds-grey-700)',
              padding: '2px 8px',
              borderRadius: 'var(--tds-radius-s)',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}>
              <HardDrive size={12} /> 음성 미저장 (로컬 원칙)
            </span>
          </div>
        </div>
      )}

      {/* 4. 카운트다운 오버레이 */}
      {countdown !== null && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(255, 255, 255, 0.92)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 500,
        }}>
          <div style={{
            fontSize: '96px',
            fontWeight: 800,
            color: 'var(--tds-blue-500)',
            marginBottom: '16px',
          }}>
            {countdown}
          </div>
          <div className="tds-h3" style={{ color: 'var(--tds-grey-700)' }}>
            곧 텔레프롬프터가 시작돼요
          </div>
          <p className="tds-body-2" style={{ color: 'var(--tds-grey-500)', marginTop: '8px' }}>
            카메라 렌즈를 편안하게 응시해 주세요.
          </p>
        </div>
      )}

      {/* 5. 중앙 텔레프롬프터 뷰포트 & 아이콘택트 밴드 */}
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

      {/* 6. 하단 플로팅 컨트롤 덱 (Floating Control Deck) */}
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
            size="m"
            onClick={handleResetTop}
            icon={<RotateCcw size={16} />}
          >
            처음으로
          </TButton>
          <TButton
            variant="secondary"
            size="m"
            onClick={handlePrevParagraph}
            icon={<ChevronUp size={16} />}
          >
            이전 문단
          </TButton>
          <TButton
            variant="secondary"
            size="m"
            onClick={handleNextParagraph}
            icon={<ChevronDown size={16} />}
          >
            다음 문단
          </TButton>
        </div>

        {/* 중앙: 재생 / 일시정지 CTA (Space) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <TButton
            variant="primary"
            size="l"
            onClick={togglePlay}
            icon={isPlaying ? <Pause size={18} /> : <Play size={18} />}
            style={{ width: '160px' }}
          >
            {isPlaying ? '일시정지 (Space)' : '재생 (Space)'}
          </TButton>
        </div>

        {/* 우측: WPM 속도 조절 & 종료 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {scrollMode === 'constant' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                onClick={() => setWpm((prev) => Math.max(60, prev - 10))}
                style={{ width: '32px', height: '32px', borderRadius: 'var(--tds-radius-m)', border: '1px solid var(--tds-line-default)', background: 'none', cursor: 'pointer', fontWeight: 700 }}
              >
                -
              </button>
              <span className="tds-tabular" style={{ fontWeight: 700, fontSize: '15px', width: '70px', textAlign: 'center' }}>
                {wpm} WPM
              </span>
              <button
                onClick={() => setWpm((prev) => Math.min(240, prev + 10))}
                style={{ width: '32px', height: '32px', borderRadius: 'var(--tds-radius-m)', border: '1px solid var(--tds-line-default)', background: 'none', cursor: 'pointer', fontWeight: 700 }}
              >
                +
              </button>
            </div>
          )}

          <TButton
            variant="ghost"
            size="m"
            onClick={() => { stopSpeechEngine(); onClose(); }}
          >
            연습 종료
          </TButton>
        </div>
      </div>
    </div>
  );
};
