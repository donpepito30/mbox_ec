import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Register PWA Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((reg) => {
      console.log('[Mbox_Ec SW registered] Scope:', reg.scope);
    }).catch((err) => {
      console.warn('[Mbox_Ec SW registration failed]:', err);
    });
  });
}

createRoot(document.getElementById('root')!).render(<App />);
