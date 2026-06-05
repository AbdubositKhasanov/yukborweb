import React from 'react';
import ReactDOM from 'react-dom/client';
import { Toaster } from 'react-hot-toast';
import App from './App';
import './services/firebase';
import { setupServiceWorkerUpdates } from './services/serviceWorkerUpdates';
import { trackAppOpen, trackFirstOpen } from './services/analytics';
import './styles/yukbor-design-system.css';
import './styles/main.css';
import './styles/mobile-responsive.css';

// Firebase Analytics — app open events
trackAppOpen();
trackFirstOpen();

// Telegram Mini App — to'liq ekranda ochish
if (window.Telegram?.WebApp) {
  window.Telegram.WebApp.ready();
  window.Telegram.WebApp.expand();
}

// Mini App ochilganda va WebView yana aktiv bo'lganda yangi build borligini
// tekshiramiz. VitePWA autoUpdate yangi SW'ni aktiv qilib, kerak bo'lsa
// oynani avtomatik yangilaydi.
setupServiceWorkerUpdates();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
    <Toaster />
  </React.StrictMode>
);
