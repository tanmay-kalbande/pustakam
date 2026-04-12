import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { inject } from '@vercel/analytics';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';
import '@fontsource/rubik/300.css';
import '@fontsource/rubik/400.css';
import '@fontsource/rubik/500.css';
import '@fontsource/rubik/600.css';
import '@fontsource/rubik/700.css';
import '@fontsource/rubik/800.css';
import '@fontsource/rubik/900.css';

// Initialize Vercel Analytics
inject();

// Service Worker update checker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.ready.then(registration => {
    const checkForUpdates = () => {
      if (document.visibilityState === 'visible' && navigator.onLine) {
        void registration.update();
      }
    };

    // Check for updates every 5 minutes, but only when the tab is active and online.
    const updateTimer = window.setInterval(checkForUpdates, 5 * 60 * 1000);
    document.addEventListener('visibilitychange', checkForUpdates);
    window.addEventListener('online', checkForUpdates);

    // Listen for new service worker
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          }
        });
      }
    });

    window.addEventListener('beforeunload', () => {
      window.clearInterval(updateTimer);
      document.removeEventListener('visibilitychange', checkForUpdates);
      window.removeEventListener('online', checkForUpdates);
    }, { once: true });
  });
}

import NotFoundPage from './components/NotFoundPage';
import OnboardingForm from './components/OnboardingForm';

const pathname = window.location.pathname;

if (pathname === '/join') {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <OnboardingForm />
    </StrictMode>
  );
} else if (pathname !== '/' && pathname !== '/index.html') {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <NotFoundPage />
    </StrictMode>
  );
} else {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>
  );
}
