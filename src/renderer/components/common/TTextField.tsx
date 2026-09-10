import React, { useState, type InputHTMLAttributes, type ReactNode } from 'react';

interface TTextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  errorText?: string;
  leftIcon?: ReactNode;
  rightAction?: ReactNode;
}

export const TTextField: React.FC<TTextFieldProps> = ({
  label,
  errorText,
  leftIcon,
  rightAction,
  style,
  onFocus,
  onBlur,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    onFocus?.(e);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(false);
    onBlur?.(e);
  };

  const hasError = Boolean(errorText);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
      {label && (
        <label className="tds-label-s" style={{ color: 'var(--tds-fg-secondary)' }}>
          {label}
        </label>
      )}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          height: '48px',
          borderRadius: 'var(--tds-radius-m, 12px)',
          backgroundColor: isFocused ? 'var(--tds-white, #FFFFFF)' : 'var(--tds-bg-secondary, #F2F4F6)',
          border: hasError
            ? '1.5px solid var(--tds-red-500, #F04452)'
            : isFocused
            ? '1.5px solid var(--tds-blue-500, #3182F6)'
            : '1px solid var(--tds-line-default, #E5E8EB)',
          padding: '0 14px',
          gap: '10px',
          transition: 'all 150ms cubic-bezier(0.22, 0.61, 0.36, 1)',
        }}
      >
        {leftIcon && (
          <span style={{ color: isFocused ? 'var(--tds-blue-500)' : 'var(--tds-grey-500)', display: 'flex' }}>
            {leftIcon}
          </span>
        )}
        <input
          style={{
            flex: 1,
            height: '100%',
            border: 'none',
            outline: 'none',
            backgroundColor: 'transparent',
            color: 'var(--tds-fg-primary, #191F28)',
            fontSize: '15px',
            fontFamily: 'inherit',
            ...style,
          }}
          onFocus={handleFocus}
          onBlur={handleBlur}
          {...props}
        />
        {rightAction}
      </div>
      {hasError && (
        <span className="tds-caption" style={{ color: 'var(--tds-red-500)' }}>
          {errorText}
        </span>
      )}
    </div>
  );
};
