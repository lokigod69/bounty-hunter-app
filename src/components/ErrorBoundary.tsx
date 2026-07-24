// Root error boundary. Without one, any render-time failure becomes a silent
// white screen — the worst possible failure mode inside a Capacitor shell on
// TestFlight, where there is no console to look at. Deliberately dependency-free
// and style-minimal: it must render even when the theme/i18n providers are the
// thing that crashed.

import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, message: '' };

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : String(error),
    };
  }

  componentDidCatch(error: unknown, info: ErrorInfo): void {
    console.error('Root error boundary caught:', error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px',
          padding: '24px',
          background: 'radial-gradient(ellipse at bottom, #1B2735 0%, #090A0F 100%)',
          color: '#c0c5ce',
          fontFamily: "'Poppins', 'Segoe UI', sans-serif",
          textAlign: 'center',
        }}
      >
        <p style={{ fontSize: '18px', fontWeight: 600, color: '#F2F5F8', margin: 0 }}>
          Something went wrong
        </p>
        <p style={{ fontSize: '13px', maxWidth: '420px', margin: 0, opacity: 0.8 }}>
          {this.state.message || 'An unexpected error occurred.'}
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          style={{
            marginTop: '8px',
            padding: '12px 24px',
            borderRadius: '8px',
            border: 'none',
            background: '#20F9D2',
            color: '#06231d',
            fontWeight: 700,
            fontSize: '14px',
            cursor: 'pointer',
          }}
        >
          Reload
        </button>
      </div>
    );
  }
}

export default ErrorBoundary;
