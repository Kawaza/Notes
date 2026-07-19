import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { UpdateProvider } from './context/UpdateContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <UpdateProvider>
        <App />
      </UpdateProvider>
    </ErrorBoundary>
  </StrictMode>
);
