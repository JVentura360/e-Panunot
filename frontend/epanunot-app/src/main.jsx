import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import RequestProgress from './components/RequestProgress.jsx';
import { BlockProvider } from './context/BlockContext.jsx';
import './index.css';
import { initializeTheme } from './theme.js';

initializeTheme();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <BlockProvider>
        <RequestProgress />
        <App />
      </BlockProvider>
    </BrowserRouter>
  </StrictMode>
);
