import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { BlockProvider } from './context/BlockContext.jsx';
import './index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <BlockProvider>
        <App />
      </BlockProvider>
    </BrowserRouter>
  </StrictMode>
);