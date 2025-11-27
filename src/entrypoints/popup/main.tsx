import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './App.css';
import { ErrorBoundary } from 'react-error-boundary';

const PopupFallback = () => {
  return (
    <div style={{padding: '20px'}}>
      <h1>Popup Error</h1>
      <p>An error occurred while loading the popup. Please try again.</p>
      <button onClick={() => location.reload()}>Reset</button>
    </div>
  )
}



ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary FallbackComponent={PopupFallback}>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);

window.addEventListener('error', (e) => {
  console.error('[Popup] Uncaught error:', e.error ?? e.message);
  e.preventDefault(); 
});
window.addEventListener('unhandledrejection', (e) => {
  console.error('[Popup] Unhandled promise rejection:', e.reason);
  e.preventDefault(); 
});