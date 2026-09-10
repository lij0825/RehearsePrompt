import React, { type ReactNode } from 'react';
import { TButton } from './TButton.tsx';

interface TDialogProps {
  isOpen: boolean;
  title: string;
  body: string | ReactNode;
  primaryLabel?: string;
  primaryVariant?: 'primary' | 'danger';
  secondaryLabel?: string;
  onPrimary: () => void;
  onSecondary?: () => void;
}

export const TDialog: React.FC<TDialogProps> = ({
  isOpen,
  title,
  body,
  primaryLabel = '확인',
  primaryVariant = 'primary',
  secondaryLabel = '취소',
  onPrimary,
  onSecondary,
}) => {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'var(--tds-overlay-scrim, rgba(0, 0, 0, 0.56))',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      backdropFilter: 'blur(2px)',
    }}>
      <div style={{
        width: '400px',
        maxWidth: '90vw',
        backgroundColor: 'var(--tds-bg-primary, #FFFFFF)',
        borderRadius: 'var(--tds-radius-2xl, 20px)',
        padding: '24px',
        boxShadow: 'var(--tds-shadow-3)',
        display: 'flex',
        flexDirection: 'column',
      }}>
        <h3 className="tds-title-1" style={{ marginBottom: '8px', color: 'var(--tds-fg-primary)' }}>
          {title}
        </h3>
        <div className="tds-body-2" style={{ color: 'var(--tds-fg-secondary)', marginBottom: '24px', lineHeight: 1.5 }}>
          {body}
        </div>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          {secondaryLabel && onSecondary && (
            <TButton
              variant="secondary"
              size="l"
              style={{ flex: 1 }}
              onClick={onSecondary}
            >
              {secondaryLabel}
            </TButton>
          )}
          <TButton
            variant={primaryVariant}
            size="l"
            style={{ flex: 1 }}
            onClick={onPrimary}
          >
            {primaryLabel}
          </TButton>
        </div>
      </div>
    </div>
  );
};
