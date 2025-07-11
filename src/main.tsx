// src/main.tsx
// Application entry point

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './i18n';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);