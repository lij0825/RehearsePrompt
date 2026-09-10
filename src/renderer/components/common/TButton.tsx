import React, { type ButtonHTMLAttributes, type ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
export type ButtonSize = 'xl' | 'l' | 'm' | 's';

interface TButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
  icon?: ReactNode;
}

export const TButton: React.FC<TButtonProps> = ({
  variant = 'primary',
  size = 'l',
  children,
  icon,
  style,
  disabled,
  ...props
}) => {
  // Size specifications
  const sizeStyles: Record<ButtonSize, React.CSSProperties> = {
    xl: { height: '56px', borderRadius: 'var(--tds-radius-xl)', fontSize: '17px', fontWeight: 700, padding: '0 24px' },
    l: { height: '48px', borderRadius: 'var(--tds-radius-l)', fontSize: '17px', fontWeight: 700, padding: '0 20px' },
    m: { height: '40px', borderRadius: 'var(--tds-radius-m)', fontSize: '15px', fontWeight: 600, padding: '0 16px' },
    s: { height: '32px', borderRadius: '10px', fontSize: '13px', fontWeight: 600, padding: '0 12px' },
  };

  // Variant specifications
  const variantStyles: Record<ButtonVariant, React.CSSProperties> = {
    primary: {
      backgroundColor: 'var(--tds-fill-brand, #3182F6)',
      color: 'var(--tds-white, #FFFFFF)',
      border: 'none',
    },
    secondary: {
      backgroundColor: 'var(--tds-bg-secondary, #F2F4F6)',
      color: 'var(--tds-fg-primary, #191F28)',
      border: 'none',
    },
    danger: {
      backgroundColor: 'var(--tds-red-500, #F04452)',
      color: 'var(--tds-white, #FFFFFF)',
      border: 'none',
    },
    ghost: {
      backgroundColor: 'transparent',
      color: 'var(--tds-fg-brand, #3182F6)',
      border: 'none',
    },
  };

  return (
    <button
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.3 : 1,
        transition: 'all 120ms cubic-bezier(0.22, 0.61, 0.36, 1)',
        whiteSpace: 'nowrap',
        ...sizeStyles[size],
        ...variantStyles[variant],
        ...style,
      }}
      disabled={disabled}
      {...props}
    >
      {icon && <span style={{ display: 'inline-flex', alignItems: 'center' }}>{icon}</span>}
      {children}
    </button>
  );
};
