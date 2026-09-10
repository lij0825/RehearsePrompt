import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('[ErrorBoundary caught error]:', error, errorInfo);
  }

  private handleReset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  public render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          padding: '24px',
          textAlign: 'center',
          backgroundColor: 'var(--tds-bg-primary)',
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: 'var(--tds-radius-full)',
            backgroundColor: 'var(--tds-red-50)',
            color: 'var(--tds-red-500)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '28px',
            marginBottom: '16px',
          }}>
            ⚠️
          </div>
          <h2 className="tds-h2" style={{ marginBottom: '8px' }}>
            화면을 불러오지 못했어요
          </h2>
          <p className="tds-body-2" style={{ color: 'var(--tds-fg-secondary)', marginBottom: '24px', maxWidth: '420px' }}>
            일시적인 문제가 발생했어요. 아래 버튼을 눌러 다시 시도하거나 앱을 다시 실행해 주세요.
          </p>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={this.handleReset}
              style={{
                height: '48px',
                padding: '0 24px',
                backgroundColor: 'var(--tds-bg-brand)',
                color: 'var(--tds-white)',
                border: 'none',
                borderRadius: 'var(--tds-radius-l)',
                fontWeight: 700,
                fontSize: '15px',
                cursor: 'pointer',
              }}
            >
              다시 시도하기
            </button>
            <button
              onClick={() => window.location.reload()}
              style={{
                height: '48px',
                padding: '0 24px',
                backgroundColor: 'var(--tds-bg-secondary)',
                color: 'var(--tds-fg-primary)',
                border: 'none',
                borderRadius: 'var(--tds-radius-l)',
                fontWeight: 600,
                fontSize: '15px',
                cursor: 'pointer',
              }}
            >
              새로고침
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
