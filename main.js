// Punto de entrada de la aplicación.
// Inicializa el estado del juego, monta la interfaz y registra el service worker.

import { initGame } from './core/gameState.js';
import { getSettings } from './core/storage.js';
import { createApp } from './ui/app.js';

// Aplica el tema almacenado en la configuración. Si el usuario ha elegido
// 'auto', se respeta la preferencia de sistema (`prefers-color-scheme`).
function applyTheme() {
  const settings = getSettings();
  let theme = settings?.theme || 'auto';
  const htmlEl = document.documentElement;
  if (theme === 'auto') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    theme = prefersDark ? 'dark' : 'light';
  }
  htmlEl.setAttribute('data-theme', theme);
}

async function start() {
  // Inicia el estado del juego y carga el primer puzzle
  await initGame();
  // Monta la interfaz
  const root = document.getElementById('app');
  createApp(root);
  // Aplica el tema del usuario
  applyTheme();
  // Registra el service worker para permitir la funcionalidad offline
  if ('serviceWorker' in navigator) {
    try {
      await navigator.serviceWorker.register('/sw.js');
    } catch (e) {
      console.warn('No se pudo registrar el service worker', e);
    }
  }
}

start();