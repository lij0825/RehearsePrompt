import React from 'react';
import type { IScript } from '../../../types/index.ts';
import { TTextField } from '../common/TTextField.tsx';
import { TButton } from '../common/TButton.tsx';
import { Search, Star, Plus, Upload, Trash2, RotateCcw, Clock } from 'lucide-react';

interface ScriptSidebarProps {
  scripts: IScript[];
  selectedScriptId: string | null;
  onSelectScript: (script: IScript) => void;
  onCreateNew: () => void;
  onImport: () => void;
  onToggleFavorite: (script: IScript, e: React.MouseEvent) => void;
  onRestoreScript: (id: string, e: React.MouseEvent) => void;
  onPermanentDelete: (id: string, e: React.MouseEvent) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  activeFilter: 'all' | 'favorites' | 'trash';
  onFilterChange: (filter: 'all' | 'favorites' | 'trash') => void;
  sortBy: 'updatedAt' | 'createdAt' | 'title';
  onSortChange: (sort: 'updatedAt' | 'createdAt' | 'title') => void;
}

export const ScriptSidebar: React.FC<ScriptSidebarProps> = ({
  scripts,
  selectedScriptId,
  onSelectScript,
  onCreateNew,
  onImport,
  onToggleFavorite,
  onRestoreScript,
  onPermanentDelete,
  searchQuery,
  onSearchChange,
  activeFilter,
  onFilterChange,
  sortBy,
  onSortChange,
}) => {
  // 필터링
  const filtered = scripts.filter((s) => {
    if (activeFilter === 'trash') {
      if (!s.deletedAt) return false;
    } else {
      if (s.deletedAt) return false;
      if (activeFilter === 'favorites' && !s.isFavorite) return false;
    }

    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const titleMatch = s.title.toLowerCase().includes(query);
    const contentMatch = s.content.toLowerCase().includes(query);
    const tagMatch = s.tags.some((t: string) => t.toLowerCase().includes(query));
    return titleMatch || contentMatch || tagMatch;
  });

  // 정렬
  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'updatedAt') {
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    }
    if (sortBy === 'createdAt') {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
    return a.title.localeCompare(b.title, 'ko-KR');
  });

  return (
    <aside style={{
      width: '320px',
      backgroundColor: 'var(--tds-bg-primary)',
      borderRight: '1px solid var(--tds-line-default)',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
    }}>
      {/* 상단 액션 버튼 */}
      <div style={{ padding: '16px 16px 12px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <TButton
          variant="primary"
          size="l"
          style={{ width: '100%' }}
          onClick={onCreateNew}
          icon={<Plus size={18} />}
        >
          새 스크립트 작성
        </TButton>
        <TButton
          variant="secondary"
          size="m"
          style={{ width: '100%' }}
          onClick={onImport}
          icon={<Upload size={16} />}
        >
          대본 파일 가져오기 (.txt, .md, .json)
        </TButton>
      </div>

      {/* 검색창 */}
      <div style={{ padding: '0 16px 12px 16px' }}>
        <TTextField
          placeholder="제목, 본문, 태그 검색..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          leftIcon={<Search size={16} />}
        />
      </div>

      {/* 필터 칩 & 정렬 선택 */}
      <div style={{
        padding: '0 16px 12px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid var(--tds-line-default)',
      }}>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            onClick={() => onFilterChange('all')}
            style={{
              height: '30px',
              padding: '0 10px',
              borderRadius: 'var(--tds-radius-full)',
              border: activeFilter === 'all' ? 'none' : '1px solid var(--tds-line-default)',
              backgroundColor: activeFilter === 'all' ? 'var(--tds-grey-900)' : 'transparent',
              color: activeFilter === 'all' ? 'var(--tds-white)' : 'var(--tds-fg-secondary)',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            전체
          </button>
          <button
            onClick={() => onFilterChange('favorites')}
            style={{
              height: '30px',
              padding: '0 10px',
              borderRadius: 'var(--tds-radius-full)',
              border: activeFilter === 'favorites' ? 'none' : '1px solid var(--tds-line-default)',
              backgroundColor: activeFilter === 'favorites' ? 'var(--tds-blue-50)' : 'transparent',
              color: activeFilter === 'favorites' ? 'var(--tds-blue-600)' : 'var(--tds-fg-secondary)',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <Star size={12} fill={activeFilter === 'favorites' ? 'var(--tds-blue-500)' : 'none'} />
            즐겨찾기
          </button>
          <button
            onClick={() => onFilterChange('trash')}
            style={{
              height: '30px',
              padding: '0 10px',
              borderRadius: 'var(--tds-radius-full)',
              border: activeFilter === 'trash' ? 'none' : '1px solid var(--tds-line-default)',
              backgroundColor: activeFilter === 'trash' ? 'var(--tds-red-50)' : 'transparent',
              color: activeFilter === 'trash' ? 'var(--tds-red-500)' : 'var(--tds-fg-secondary)',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            휴지통
          </button>
        </div>

        {/* 정렬 셀렉터 */}
        <select
          value={sortBy}
          onChange={(e) => onSortChange(e.target.value as 'updatedAt' | 'createdAt' | 'title')}
          style={{
            border: 'none',
            backgroundColor: 'transparent',
            color: 'var(--tds-grey-600)',
            fontSize: '12px',
            fontWeight: 500,
            cursor: 'pointer',
            outline: 'none',
          }}
        >
          <option value="updatedAt">최근 수정순</option>
          <option value="createdAt">생성일순</option>
          <option value="title">가나다순</option>
        </select>
      </div>

      {/* 스크립트 리스트 */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
        {sorted.length === 0 ? (
          <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--tds-grey-400)', fontSize: '14px' }}>
            {searchQuery ? '검색 결과가 없어요.' : activeFilter === 'trash' ? '휴지통이 비어 있어요.' : '스크립트가 없어요.'}
          </div>
        ) : (
          sorted.map((s) => {
            const isSelected = s.id === selectedScriptId;
            return (
              <div
                key={s.id}
                onClick={() => onSelectScript(s)}
                style={{
                  padding: '14px',
                  borderRadius: 'var(--tds-radius-l)',
                  backgroundColor: isSelected ? 'var(--tds-blue-50)' : 'var(--tds-bg-secondary)',
                  border: isSelected ? '1.5px solid var(--tds-blue-500)' : '1px solid transparent',
                  marginBottom: '10px',
                  cursor: 'pointer',
                  transition: 'all 120ms ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{
                    fontWeight: 700,
                    fontSize: '15px',
                    color: isSelected ? 'var(--tds-blue-600)' : 'var(--tds-fg-primary)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    maxWidth: '220px',
                  }}>
                    {s.title}
                  </span>
                  {activeFilter !== 'trash' ? (
                    <button
                      onClick={(e) => onToggleFavorite(s, e)}
                      style={{
                        border: 'none',
                        background: 'none',
                        cursor: 'pointer',
                        padding: '2px',
                        color: s.isFavorite ? 'var(--tds-orange-500, #FF8A00)' : 'var(--tds-grey-400)',
                      }}
                      title={s.isFavorite ? '즐겨찾기 해제' : '즐겨찾기 추가'}
                    >
                      <Star size={16} fill={s.isFavorite ? 'currentColor' : 'none'} />
                    </button>
                  ) : (
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button
                        onClick={(e) => onRestoreScript(s.id, e)}
                        style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--tds-blue-500)' }}
                        title="복구하기"
                      >
                        <RotateCcw size={15} />
                      </button>
                      <button
                        onClick={(e) => onPermanentDelete(s.id, e)}
                        style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--tds-red-500)' }}
                        title="영구 삭제"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  )}
                </div>

                {/* 첫 문장 미리보기 */}
                <div className="tds-caption" style={{
                  color: 'var(--tds-fg-secondary)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  marginBottom: '8px',
                }}>
                  {s.content ? s.content.slice(0, 50) : '(내용 없음)'}
                </div>

                {/* 하단 메타정보 */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--tds-grey-500)', fontSize: '11px' }}>
                    <Clock size={12} />
                    <span>{new Date(s.updatedAt).toLocaleDateString('ko-KR')}</span>
                  </div>
                  <span className="tds-caption" style={{ color: 'var(--tds-grey-600)', fontWeight: 600 }}>
                    {s.wordCount}단어
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
};
