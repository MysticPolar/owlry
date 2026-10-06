import './sessionMigrate'; // first: runs before the shared Supabase client is created
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/fonts.css';
import './styles/tokens.css';
import './styles/base.css';
import { App } from './App';
import { bootBackend } from './lib/backend';
import { useStore } from './store/useStore';
import { setActiveLang } from './i18n';
import { CouncilGate } from './gate/CouncilGate';
import { grantFromUrl, hasCouncilAccess } from './gate/access';

// the persisted language wins over the browser's; keep the module-level value in step from here on
setActiveLang(useStore.getState().lang);
useStore.subscribe((s, prev) => {
  if (s.lang !== prev.lang) setActiveLang(s.lang);
});

const root = createRoot(document.getElementById('root')!);

function open() {
  bootBackend();
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

// the door (gate/access.ts): a shared ?key= link or a stored grant opens it; otherwise ask for the code
void grantFromUrl().then((granted) => {
  if (granted || hasCouncilAccess()) open();
  else
    root.render(
      <StrictMode>
        <CouncilGate onOpen={open} />
      </StrictMode>,
    );
});
