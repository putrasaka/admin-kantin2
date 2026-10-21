import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

declare const __BUILD_ID__: string;

const MAX_UPDATE_ATTEMPTS = 3;

const setBootStatus = (text: string) => {
  const el = document.getElementById('boot-status');
  if (el) el.textContent = text;
};

const hideBootLoader = () => {
  const loader = document.getElementById('boot-loader');
  if (loader) loader.style.display = 'none';
};

// Pastikan web selalu menampilkan versi terbaru: cek build-id dari server,
// kalau beda → bersihkan cache lama dan reload (maks 3x). Kalau gagal, tampilkan versi yang ada.
(async () => {
  try {
    const attempts = Number(sessionStorage.getItem('__update_attempts') || '0');
    if (attempts >= MAX_UPDATE_ATTEMPTS) {
      hideBootLoader();
      return;
    }

    const res = await fetch('/index.html', { cache: 'no-store' });
    if (!res.ok) {
      hideBootLoader();
      return;
    }
    const html = await res.text();
    const match = html.match(/<meta name="build-id" content="([^"]+)"/);
    const serverBuildId = match?.[1] || '';

    if (serverBuildId === __BUILD_ID__) {
      sessionStorage.removeItem('__update_attempts');
      hideBootLoader();
      return;
    }

    // Versi server lebih baru → purge cache lalu reload
    setBootStatus('Memperbarui ke versi terbaru...');
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
    sessionStorage.setItem('__update_attempts', String(attempts + 1));
    window.location.reload();
  } catch {
    // Gagal cek (offline, dll) → tampilkan versi yang ada
    hideBootLoader();
  }
})();

createRoot(document.getElementById('root')!).render(<App />);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((reg) => {
      // Deteksi SW baru ter-install → reload sekali untuk ambil aset terbaru
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (!newWorker) return;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            window.location.reload();
          }
        });
      });
    }).catch(() => {});
  });
}
