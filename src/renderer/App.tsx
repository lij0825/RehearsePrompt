import React, { useEffect, useState } from 'react';
import { ErrorBoundary } from './components/common/ErrorBoundary.tsx';
import { TButton } from './components/common/TButton.tsx';
import { TDialog } from './components/common/TDialog.tsx';
import { TToast, type ToastMessage } from './components/common/TToast.tsx';
import { ScriptSidebar } from './components/editor/ScriptSidebar.tsx';
import { EditorView } from './components/editor/EditorView.tsx';
import { PrompterView } from './components/prompter/PrompterView.tsx';
import type { IAppInfo, IAppSettings, IScript } from '../types/index.ts';
import { ShieldAlert, Pin, Play, Settings as SettingsIcon } from 'lucide-react';

export const App: React.FC = () => {
  const [appInfo, setAppInfo] = useState<IAppInfo | null>(null);
  const [_settings, setSettings] = useState<IAppSettings | null>(null);
  const [scripts, setScripts] = useState<IScript[]>([]);
  const [selectedScriptId, setSelectedScriptId] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'editor' | 'prompter' | 'settings'>('editor');
  const [isAlwaysOnTop, setIsAlwaysOnTop] = useState(false);

  // 사이드바 상태
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'favorites' | 'trash'>('all');
  const [sortBy, setSortBy] = useState<'updatedAt' | 'createdAt' | 'title'>('updatedAt');

  // 모달 및 토스트 상태
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [isPermanentDelete, setIsPermanentDelete] = useState(false);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ id: String(Date.now()), message, type });
    setTimeout(() => {
      setToast(null);
    }, 3000);
  };

  // 초기 데이터 로드
  useEffect(() => {
    async function init() {
      if (window.electronAPI) {
        try {
          const info = await window.electronAPI.getAppInfo();
          setAppInfo(info);

          const loadedSettings = await window.electronAPI.getSettings();
          setSettings(loadedSettings);
          setIsAlwaysOnTop(loadedSettings.windowState?.isAlwaysOnTop ?? false);

          const loadedScripts = await window.electronAPI.getAllScripts();
          setScripts(loadedScripts);

          // 첫 번째 활성 스크립트 자동 선택
          const activeScripts = loadedScripts.filter((s) => !s.deletedAt);
          if (activeScripts.length > 0) {
            setSelectedScriptId(activeScripts[0].id);
          }
        } catch (err) {
          console.error('[App] Init failed', err);
          showToast('초기 데이터를 불러오지 못했어요.', 'error');
        }
      }
    }

    init();
  }, []);

  const handleToggleAlwaysOnTop = async () => {
    const nextState = !isAlwaysOnTop;
    if (window.electronAPI) {
      await window.electronAPI.setAlwaysOnTop(nextState);
    }
    setIsAlwaysOnTop(nextState);
    showToast(nextState ? '항상 위에 표시를 켰어요.' : '항상 위에 표시를 껐어요.', 'info');
  };

  // 새 스크립트 생성
  const handleCreateNewScript = async () => {
    if (window.electronAPI) {
      const newScript = await window.electronAPI.saveScript({
        title: `새 면접 대본 (${new Date().toLocaleTimeString('ko-KR')})`,
        content: '면접관님 안녕하세요. 지원자입니다.\n\n제가 수행했던 프로젝트와 핵심 역량에 대해 말씀드리겠습니다.',
      });
      setScripts((prev) => [newScript, ...prev]);
      setSelectedScriptId(newScript.id);
      setActiveFilter('all');
      showToast('새 스크립트를 작성했어요.');
    }
  };

  // 스크립트 저장/갱신
  const handleUpdateScript = async (updatedData: Partial<IScript> & { id: string }): Promise<IScript> => {
    if (window.electronAPI) {
      const saved = await window.electronAPI.saveScript(updatedData);
      setScripts((prev) => prev.map((s) => (s.id === saved.id ? saved : s)));
      return saved;
    }
    throw new Error('API not available');
  };

  // 즐겨찾기 토글
  const handleToggleFavorite = async (target: IScript, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = await handleUpdateScript({
      id: target.id,
      isFavorite: !target.isFavorite,
    });
    showToast(updated.isFavorite ? '즐겨찾기에 추가했어요.' : '즐겨찾기에서 제외했어요.');
  };

  // 복제
  const handleDuplicateScript = async (id: string) => {
    if (window.electronAPI) {
      const duplicated = await window.electronAPI.duplicateScript(id);
      if (duplicated) {
        setScripts((prev) => [duplicated, ...prev]);
        setSelectedScriptId(duplicated.id);
        showToast('스크립트를 복제했어요.');
      }
    }
  };

  // 삭제 요청 (모달 오픈)
  const handleRequestDelete = (id: string) => {
    setDeleteTargetId(id);
    setIsPermanentDelete(false);
  };

  // 영구 삭제 요청
  const handleRequestPermanentDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteTargetId(id);
    setIsPermanentDelete(true);
  };

  // 삭제 확정 실행
  const handleConfirmDelete = async () => {
    if (!deleteTargetId || !window.electronAPI) return;

    await window.electronAPI.deleteScript(deleteTargetId, isPermanentDelete);

    if (isPermanentDelete) {
      setScripts((prev) => prev.filter((s) => s.id !== deleteTargetId));
      showToast('스크립트를 영구 삭제했어요.');
    } else {
      setScripts((prev) => prev.map((s) => (s.id === deleteTargetId ? { ...s, deletedAt: new Date().toISOString() } : s)));
      showToast('스크립트를 휴지통으로 이동했어요.');
    }

    if (selectedScriptId === deleteTargetId) {
      const remaining = scripts.filter((s) => s.id !== deleteTargetId && !s.deletedAt);
      setSelectedScriptId(remaining.length > 0 ? remaining[0].id : null);
    }

    setDeleteTargetId(null);
  };

  // 복구
  const handleRestoreScript = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.electronAPI) {
      await window.electronAPI.restoreScript(id);
      setScripts((prev) => prev.map((s) => (s.id === id ? { ...s, deletedAt: null } : s)));
      showToast('스크립트를 복구했어요.');
    }
  };

  // 파일 내보내기
  const handleExportScript = async (id: string, format: 'txt' | 'md' | 'json') => {
    if (window.electronAPI) {
      const exportedPath = await window.electronAPI.exportScript(id, format);
      if (exportedPath) {
        showToast('성공적으로 파일을 내보냈어요.');
      }
    }
  };

  // 파일 가져오기
  const handleImportScript = async () => {
    if (window.electronAPI) {
      const imported = await window.electronAPI.importScript();
      if (imported) {
        setScripts((prev) => [imported, ...prev]);
        setSelectedScriptId(imported.id);
        setActiveFilter('all');
        showToast(`'${imported.title}' 대본을 가져왔어요.`);
      }
    }
  };

  // 선택된 스크립트 객체
  const selectedScript = scripts.find((s) => s.id === selectedScriptId) || null;

  return (
    <ErrorBoundary>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: 'var(--tds-bg-secondary)' }}>
        {/* 상단 보안 및 화면 공유 투명성 고지 배너 */}
        <div style={{
          backgroundColor: 'var(--tds-blue-50)',
          color: 'var(--tds-blue-600)',
          padding: '8px 16px',
          fontSize: '12px',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          borderBottom: '1px solid var(--tds-grey-200)',
        }}>
          <ShieldAlert size={14} />
          <span>
            안내: RehearsePrompt는 윤리적 발표 연습용 텔레프롬프터입니다. 화면 공유 시 본 창이 상대방에게 그대로 노출됩니다.
          </span>
        </div>

        {/* 상단 TopBar */}
        <header style={{
          height: '56px',
          backgroundColor: 'var(--tds-bg-primary)',
          borderBottom: '1px solid var(--tds-line-default)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--tds-blue-500)' }}>
              RehearsePrompt
            </span>
            {appInfo && (
              <span className="tds-caption" style={{
                backgroundColor: 'var(--tds-grey-100)',
                color: 'var(--tds-grey-600)',
                padding: '2px 8px',
                borderRadius: 'var(--tds-radius-s)',
              }}>
                v{appInfo.version}
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TButton
              variant={isAlwaysOnTop ? 'primary' : 'secondary'}
              size="s"
              onClick={handleToggleAlwaysOnTop}
              icon={<Pin size={14} />}
            >
              {isAlwaysOnTop ? '항상 위 켜짐' : '항상 위'}
            </TButton>

            <TButton
              variant={activeTab === 'editor' ? 'primary' : 'ghost'}
              size="s"
              onClick={() => setActiveTab('editor')}
            >
              대본 편집
            </TButton>

            <TButton
              variant={activeTab === 'prompter' ? 'primary' : 'ghost'}
              size="s"
              onClick={() => setActiveTab('prompter')}
              icon={<Play size={14} />}
            >
              텔레프롬프터
            </TButton>

            <TButton
              variant={activeTab === 'settings' ? 'primary' : 'ghost'}
              size="s"
              onClick={() => setActiveTab('settings')}
              icon={<SettingsIcon size={14} />}
            >
              설정
            </TButton>
          </div>
        </header>

        {/* 메인 뷰포트 레이아웃 */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* 사이드바 */}
          <ScriptSidebar
            scripts={scripts}
            selectedScriptId={selectedScriptId}
            onSelectScript={(s) => setSelectedScriptId(s.id)}
            onCreateNew={handleCreateNewScript}
            onImport={handleImportScript}
            onToggleFavorite={handleToggleFavorite}
            onRestoreScript={handleRestoreScript}
            onPermanentDelete={handleRequestPermanentDelete}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            activeFilter={activeFilter}
            onFilterChange={setActiveFilter}
            sortBy={sortBy}
            onSortChange={setSortBy}
          />

          {/* 중앙 에디터 뷰 */}
          <main style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
            <EditorView
              script={selectedScript}
              onUpdateScript={handleUpdateScript}
              onDuplicateScript={handleDuplicateScript}
              onDeleteScript={handleRequestDelete}
              onExportScript={handleExportScript}
              onStartPrompter={(_s) => {
                setActiveTab('prompter');
                showToast('텔레프롬프터 모드를 준비하고 있어요.');
              }}
            />
          </main>
        </div>

        {/* 텔레프롬프터 모드 화면 */}
        {activeTab === 'prompter' && selectedScript && (
          <PrompterView
            script={selectedScript}
            onClose={() => setActiveTab('editor')}
            isAlwaysOnTop={isAlwaysOnTop}
            onToggleAlwaysOnTop={handleToggleAlwaysOnTop}
          />
        )}

        {/* 삭제 확인 모달 */}
        <TDialog
          isOpen={deleteTargetId !== null}
          title={isPermanentDelete ? '대본을 영구 삭제할까요?' : '대본을 휴지통으로 이동할까요?'}
          body={isPermanentDelete
            ? '삭제하면 다시 복구할 수 없어요. 정말 삭제하시겠어요?'
            : '삭제된 대본은 휴지통 탭에서 언제든지 복구할 수 있어요.'}
          primaryLabel={isPermanentDelete ? '영구 삭제' : '휴지통으로 이동'}
          primaryVariant="danger"
          secondaryLabel="취소"
          onPrimary={handleConfirmDelete}
          onSecondary={() => setDeleteTargetId(null)}
        />

        {/* 토스트 메시지 */}
        <TToast toast={toast} />
      </div>
    </ErrorBoundary>
  );
};

export default App;
