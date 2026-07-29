// src/main.tsx
// Application entry point

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { i18nReady } from './i18n';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';

function mount() {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>
  );
}

// Non-English locales are lazy chunks now, so mounting is held until the stored
// language is in memory — otherwise the first paint is English and then visibly
// swaps. `catch` still mounts: a locale that fails to load must degrade to
// English, never to a blank page.
i18nReady.then(mount).catch(mount);