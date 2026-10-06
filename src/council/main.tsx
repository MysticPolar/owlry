import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/fonts.css';
import './styles/tokens.css';
import './styles/base.css';
import { App } from './App';
import { bootBackend } from './lib/backend';
import { useStore } from './store/useStore';
import { setActiveLang } from './i18n';

// the persisted language wins over the browser's; keep the module-level value in step from here on
setActiveLang(useStore.getState().lang);
useStore.subscribe((s, prev) => {
  if (s.lang !== prev.lang) setActiveLang(s.lang);
});

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
