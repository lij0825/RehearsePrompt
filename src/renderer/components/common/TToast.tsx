import React from 'react';
import { CheckCircle2, AlertCircle } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface TToastProps {
  toast: ToastMessage | null;
  onClose?: () => void;
}

export const TToast: React.FC<TToastProps> = ({ toast }) => {
  if (!toast) return null;

  const isSuccess = toast.type === 'success';
  const isError = toast.type === 'error';

  return (
    <div style={{
      position: 'fixed',
      bottom: '32px',
      left: '50%',
      transform: 'translateX(-50%)',
      backgroundColor: 'var(--tds-grey-900, #191F28)',
      color: 'var(--tds-white, #FFFFFF)',
      padding: '12px 20px',
      borderRadius: 'var(--tds-radius-l, 14px)',
      boxShadow: 'var(--tds-shadow-toast)',
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      fontSize: '15px',
      fontWeight: 600,
      zIndex: 10000,
      animation: 'toastFadeIn 200ms cubic-bezier(0.22, 0.61, 0.36, 1)',
    }}>
      {isSuccess && <CheckCircle2 size={18} color="var(--tds-green-500, #04C755)" />}
      {isError && <AlertCircle size={18} color="var(--tds-red-500, #F04452)" />}
      <span>{toast.message}</span>
    </div>
  );
};
