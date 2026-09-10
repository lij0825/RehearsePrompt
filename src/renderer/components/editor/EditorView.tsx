import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { IScript } from '../../../types/index.ts';
import { computeTextMetrics } from '../../utils/textMetrics.ts';
import { TButton } from '../common/TButton.tsx';
import { Copy, Download, Trash2, CheckCircle2, AlertCircle, Play, FileText } from 'lucide-react';

interface EditorViewProps {
  script: IScript | null;
  onUpdateScript: (updated: Partial<IScript> & { id: string }) => Promise<IScript>;
  onDuplicateScript: (id: string) => void;
  onDeleteScript: (id: string) => void;
  onExportScript: (id: string, format: 'txt' | 'md' | 'json') => void;
  onStartPrompter: (script: IScript) => void;
}

export const EditorView: React.FC<EditorViewProps> = ({
  script,
  onUpdateScript,
  onDuplicateScript,
  onDeleteScript,
  onExportScript,
  onStartPrompter,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState('');
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'dirty' | 'error'>('saved');
  const [lastSavedTime, setLastSavedTime] = useState<string>('');
  const [showExportMenu, setShowExportMenu] = useState(false);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 스크립트 선택 변경 시 상태 동기화
  useEffect(() => {
    if (script) {
      setTitle(script.title);
      setDescription(script.description || '');
      setContent(script.content);
      setSaveStatus('saved');
      setLastSavedTime(new Date(script.updatedAt).toLocaleTimeString('ko-KR'));
    }
  }, [script?.id]);

  // 실시간 통계 계산
  const metrics = computeTextMetrics(content, 130);

  // 실제 저장 처리 함수
  const triggerSave = useCallback(
    async (newTitle: string, newDesc: string, newContent: string) => {
      if (!script) return;
      setSaveStatus('saving');
      try {
        const computed = computeTextMetrics(newContent, 130);
        await onUpdateScript({
          id: script.id,
          title: newTitle.trim() || '제목 없는 스크립트',
          description: newDesc,
          content: newContent,
          wordCount: computed.wordCount,
          charCount: computed.charCountWithoutSpaces,
          estimatedDuration: computed.estimatedDurationSeconds,
        });
        setSaveStatus('saved');
        setLastSavedTime(new Date().toLocaleTimeString('ko-KR'));
      } catch (err) {
        console.error('[EditorView] Save failed', err);
        setSaveStatus('error');
      }
    },
    [script, onUpdateScript]
  );

  // 자동 저장 디바운스 핸들러 (800ms)
  const scheduleAutoSave = useCallback(
    (newTitle: string, newDesc: string, newContent: string) => {
      setSaveStatus('dirty');
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        triggerSave(newTitle, newDesc, newContent);
      }, 800);
    },
    [triggerSave]
  );

  // 키보드 단축키 (Ctrl+S 수동 즉시 저장)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }
        triggerSave(title, description, content);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [title, description, content, triggerSave]);

  if (!script) {
    return (
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--tds-grey-400)',
        padding: '32px',
      }}>
        <FileText size={48} strokeWidth={1.5} style={{ marginBottom: '16px', color: 'var(--tds-grey-300)' }} />
        <h2 className="tds-h3" style={{ color: 'var(--tds-grey-600)', marginBottom: '8px' }}>
          선택된 스크립트가 없어요
        </h2>
        <p className="tds-body-2">
          왼쪽 목록에서 대본을 선택하거나 [새 스크립트 작성]을 눌러보세요.
        </p>
      </div>
    );
  }

  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      backgroundColor: 'var(--tds-bg-primary)',
      overflow: 'hidden',
    }}>
      {/* 툴바 상단 영역 */}
      <div style={{
        height: '56px',
        padding: '0 24px',
        borderBottom: '1px solid var(--tds-line-default)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        {/* 저장 상태 인디케이터 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {saveStatus === 'saved' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--tds-green-500)', fontSize: '13px', fontWeight: 600 }}>
              <CheckCircle2 size={15} />
              <span>저장되었어요 {lastSavedTime && `(${lastSavedTime})`}</span>
            </div>
          )}
          {saveStatus === 'saving' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--tds-blue-500)', fontSize: '13px', fontWeight: 600 }}>
              <span className="tds-tabular">저장 중...</span>
            </div>
          )}
          {saveStatus === 'dirty' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--tds-grey-500)', fontSize: '13px' }}>
              <span>입력 중 (800ms 뒤 자동 저장)</span>
            </div>
          )}
          {saveStatus === 'error' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--tds-red-500)', fontSize: '13px', fontWeight: 600 }}>
              <AlertCircle size={15} />
              <span>저장에 실패했어요</span>
              <button
                onClick={() => triggerSave(title, description, content)}
                style={{ marginLeft: '4px', textDecoration: 'underline', border: 'none', background: 'none', color: 'inherit', cursor: 'pointer' }}
              >
                다시 시도
              </button>
            </div>
          )}
        </div>

        {/* 액션 버튼 그룹 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative' }}>
          <TButton
            variant="secondary"
            size="s"
            onClick={() => onDuplicateScript(script.id)}
            icon={<Copy size={14} />}
          >
            복제
          </TButton>

          {/* 내보내기 드롭다운 */}
          <div style={{ position: 'relative' }}>
            <TButton
              variant="secondary"
              size="s"
              onClick={() => setShowExportMenu((prev) => !prev)}
              icon={<Download size={14} />}
            >
              내보내기
            </TButton>
            {showExportMenu && (
              <div style={{
                position: 'absolute',
                top: '40px',
                right: 0,
                backgroundColor: 'var(--tds-bg-primary)',
                borderRadius: 'var(--tds-radius-m)',
                boxShadow: 'var(--tds-shadow-2)',
                border: '1px solid var(--tds-line-default)',
                width: '160px',
                zIndex: 100,
                padding: '4px 0',
              }}>
                <button
                  onClick={() => { setShowExportMenu(false); onExportScript(script.id, 'txt'); }}
                  style={{ width: '100%', padding: '10px 16px', border: 'none', background: 'none', textAlign: 'left', fontSize: '14px', cursor: 'pointer' }}
                >
                  텍스트 (.txt)
                </button>
                <button
                  onClick={() => { setShowExportMenu(false); onExportScript(script.id, 'md'); }}
                  style={{ width: '100%', padding: '10px 16px', border: 'none', background: 'none', textAlign: 'left', fontSize: '14px', cursor: 'pointer' }}
                >
                  마크다운 (.md)
                </button>
                <button
                  onClick={() => { setShowExportMenu(false); onExportScript(script.id, 'json'); }}
                  style={{ width: '100%', padding: '10px 16px', border: 'none', background: 'none', textAlign: 'left', fontSize: '14px', cursor: 'pointer' }}
                >
                  JSON 백업 (.json)
                </button>
              </div>
            )}
          </div>

          <TButton
            variant="ghost"
            size="s"
            style={{ color: 'var(--tds-red-500)' }}
            onClick={() => onDeleteScript(script.id)}
            icon={<Trash2 size={14} />}
          >
            삭제
          </TButton>
        </div>
      </div>

      {/* 실시간 통계 칩 바 */}
      <div style={{
        backgroundColor: 'var(--tds-bg-secondary)',
        padding: '8px 24px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        fontSize: '13px',
        color: 'var(--tds-grey-700)',
      }}>
        <div>예상 시간: <strong style={{ color: 'var(--tds-blue-500)' }}>{metrics.formattedDuration}</strong> (130 WPM)</div>
        <div>단어 수: <strong>{metrics.wordCount}</strong>단어</div>
        <div>글자 수: <strong>{metrics.charCountWithoutSpaces}</strong>자 (공백 제외)</div>
        <div>문단 수: <strong>{metrics.paragraphCount}</strong>개</div>
        <div>문장 수: <strong>{metrics.sentenceCount}</strong>개</div>
      </div>

      {/* 본문 에디터 영역 */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '32px 40px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        maxWidth: '900px',
        width: '100%',
        margin: '0 auto',
      }}>
        {/* 제목 인풋 */}
        <input
          type="text"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            scheduleAutoSave(e.target.value, description, content);
          }}
          placeholder="대본 제목을 입력해 주세요"
          style={{
            fontSize: '26px',
            fontWeight: 700,
            border: 'none',
            outline: 'none',
            color: 'var(--tds-fg-primary)',
            backgroundColor: 'transparent',
            lineHeight: 1.3,
            paddingBottom: '8px',
            borderBottom: '1.5px solid var(--tds-line-default)',
          }}
        />

        {/* 설명 인풋 (선택사항) */}
        <input
          type="text"
          value={description}
          onChange={(e) => {
            setDescription(e.target.value);
            scheduleAutoSave(title, e.target.value, content);
          }}
          placeholder="간단한 메모나 면접 상황 설명 (예: 1차 기술 면접 1분 자기소개)"
          style={{
            fontSize: '14px',
            border: 'none',
            outline: 'none',
            color: 'var(--tds-grey-600)',
            backgroundColor: 'transparent',
          }}
        />

        {/* 본문 에디터 (textarea) */}
        <textarea
          value={content}
          onChange={(e) => {
            setContent(e.target.value);
            scheduleAutoSave(title, description, e.target.value);
          }}
          placeholder="면접 답변이나 발표 대본을 작성해 주세요. 문단 구분과 줄바꿈이 텔레프롬프터에 그대로 반영돼요."
          style={{
            flex: 1,
            minHeight: '380px',
            border: 'none',
            outline: 'none',
            resize: 'none',
            fontSize: '17px',
            lineHeight: 1.8,
            color: 'var(--tds-fg-primary)',
            fontFamily: 'inherit',
            backgroundColor: 'transparent',
          }}
        />
      </div>

      {/* 하단 고정 액션 바 (BottomCTA) */}
      <div style={{
        padding: '16px 24px',
        borderTop: '1px solid var(--tds-line-default)',
        backgroundColor: 'var(--tds-bg-primary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div className="tds-caption" style={{ color: 'var(--tds-grey-500)' }}>
          단축키: <kbd style={{ padding: '2px 6px', backgroundColor: 'var(--tds-grey-100)', borderRadius: '4px' }}>Ctrl + S</kbd> 즉시 저장
        </div>
        <TButton
          variant="primary"
          size="xl"
          onClick={() => onStartPrompter({
            ...script,
            title,
            description,
            content,
            wordCount: metrics.wordCount,
            estimatedDuration: metrics.estimatedDurationSeconds,
          })}
          icon={<Play size={20} />}
        >
          이 스크립트로 연습 시작하기
        </TButton>
      </div>
    </div>
  );
};
