import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { inject } from '@vercel/analytics';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';
import '@fontsource/rubik/latin-400.css';
import '@fontsource/rubik/latin-500.css';
import '@fontsource/rubik/latin-700.css';
import '@fontsource/rubik/latin-900.css';

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

const pathname = window.location.pathname;
const isStudyRoute = pathname === '/study' || pathname.startsWith('/study/');
const root = createRoot(document.getElementById('root')!);

if (pathname === '/join') {
  void import('./components/OnboardingForm').then(({ default: OnboardingForm }) => {
    root.render(
      <StrictMode>
        <OnboardingForm />
      </StrictMode>
    );
  });
} else if (pathname !== '/' && pathname !== '/index.html' && !isStudyRoute) {
  void import('./components/NotFoundPage').then(({ default: NotFoundPage }) => {
    root.render(
      <StrictMode>
        <NotFoundPage />
      </StrictMode>
    );
  });
} else {
  root.render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>
  );
}
