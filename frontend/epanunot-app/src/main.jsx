import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import RequestProgress from './components/RequestProgress.jsx';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './api/client.js';
import './index.css';
import { initializeTheme } from './theme.js';
import { initializeOffline } from './offline/runtime.js';
import { apiQueryOptions } from './api/client.js';
import { initializePwa } from './pwa/updates.js';
import './pwa/install.js';

initializeTheme();
// After an update, an open tab can ask for a chunk that no longer exists. Reload once to get the new build.
const RELOAD_KEY = 'epanunot:chunk-reload';
window.addEventListener('vite:preloadError', (event) => {
  try {
    if (sessionStorage.getItem(RELOAD_KEY)) return;
    sessionStorage.setItem(RELOAD_KEY, '1');
  } catch { return; }
  event.preventDefault();
  window.location.reload();
});
setTimeout(() => { try { sessionStorage.removeItem(RELOAD_KEY); } catch { /* ignore */ } }, 10000);
await initializeOffline(queryClient, apiQueryOptions);
void initializePwa();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <RequestProgress />
        <App />
      </QueryClientProvider>
    </BrowserRouter>
  </StrictMode>
);
