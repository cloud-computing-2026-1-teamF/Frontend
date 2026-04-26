// Vite entrypoint. Loads the global token / nav / auth / factor-viz
// stylesheets once so every page gets them — page-specific CSS is
// imported by the page component itself (e.g. Landing.tsx).
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import './shared/tokens.css';
import './shared/nav.css';
import './shared/auth.css';
import './shared/factor-viz.css';

import { App } from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
