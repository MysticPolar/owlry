import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';

import './styles/tokens.css';
import './styles/global.css';
import './styles/playbill.css';
import App from './App';
import { useStore } from './store/useStore';

// keep the installed app fresh; offline assets are precached by the SW
registerSW({ immediate: true });

// test hook: expose the store for UI verification builds only
// (set VITE_EXPOSE_STORE=1 at build time; never set in deploy workflows)
if (import.meta.env.VITE_EXPOSE_STORE === '1') {
  (window as unknown as { __owlry: typeof useStore }).__owlry = useStore;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
