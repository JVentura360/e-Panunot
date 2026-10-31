import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import RequestProgress from './components/RequestProgress.jsx';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './api/client.js';
import './index.css';
import { initializeTheme } from './theme.js';

initializeTheme();

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
