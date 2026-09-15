import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/fonts.css';
import './styles/tokens.css';
import './styles/base.css';
import { App } from './App';
import { bootBackend } from './lib/backend';

// The Council booted for real: clear the flag the service-worker escape shim
// sets before it reloads (scripts/sw-escape-shims.mjs), so its loop guard
// only ever fires when an escape did not lead here.
try {
  sessionStorage.removeItem('owlry-council-sw-escape');
} catch {
  /* storage unavailable — nothing to clear */
}

bootBackend();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
