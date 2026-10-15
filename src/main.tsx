import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

declare const __BUILD_ID__: string;

// Version gate: bundle ID di cache beda dari build sekarang -> hapus semua cache + LocalStorage, lalu reload 1x
(async () => {
  try {
    if ('caches' in window) {
      const keys = await caches.keys();
      for (const name of keys) {
        const cache = await caches.open(name);
        const res = await cache.match('/index.html');
        if (res) {
          const html = await res.text();
          if (!html.includes(__BUILD_ID__)) {
            const allKeys = await caches.keys();
            await Promise.all(allKeys.map((k) => caches.delete(k)));
            localStorage.clear();
            location.reload();
            return;
          }
        }
      }
    }
  } catch {
    // Cache API tidak tersedia — lanjut normal
  }
})();

createRoot(document.getElementById('root')!).render(<App />);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
