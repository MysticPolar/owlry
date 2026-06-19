import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';

import './styles/tokens.css';
import './styles/global.css';
import App from './App';

// keep the installed app fresh; offline assets are precached by the SW
registerSW({ immediate: true });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
