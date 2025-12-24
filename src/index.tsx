import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}


import { registerSW } from 'virtual:pwa-register';

if ('serviceWorker' in navigator) {
  // Checks for updates every hour
  const intervalMS = 60 * 60 * 1000;

  const updateSW = registerSW({
    onNeedRefresh() {
      // Prompt user to refresh
      if (confirm('New content available. Reload?')) {
        updateSW(true);
      }
    },
    onOfflineReady() {
      console.log('App ready to work offline');
    },
  });
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);