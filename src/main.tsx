import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';

import './styles/tokens.css';
import './styles/type.css';
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

const root = createRoot(document.getElementById('root')!);

// the type specimen, at #type. Dev-only twice over: the env check lets the
// bundler drop the branch, and the dynamic import keeps the component out of
// the production graph entirely. There is no router here — the app is a
// zustand tab machine — so a hash is the whole mechanism.
if (import.meta.env.DEV && window.location.hash === '#type') {
  void import('./dev/TypeSpecimen').then(({ default: TypeSpecimen }) => {
    root.render(
      <StrictMode>
        <TypeSpecimen />
      </StrictMode>,
    );
  });
} else {
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
