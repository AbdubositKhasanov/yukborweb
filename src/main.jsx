import React from 'react';
import ReactDOM from 'react-dom/client';
import { Toaster } from 'react-hot-toast';
import App from './App';
import './services/firebase';
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

// Service Worker registratsiyasi vite-plugin-pwa tomonidan
// avtomatik qo'shiladigan /registerSW.js skripti orqali boshqariladi
// (registerType: 'autoUpdate'). Qo'lda register() chaqirmaymiz —
// aks holda registratsiya ikki marta sodir bo'lib, update flow chalkashadi.

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
    <Toaster />
  </React.StrictMode>
);
