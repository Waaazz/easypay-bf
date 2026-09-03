// Capture partagée de l'évènement `beforeinstallprompt` : le navigateur ne
// le déclenche qu'une fois et un seul appel à `.prompt()` est possible, donc
// tous les boutons "Installer" de l'app (bannière + page Compte) doivent
// passer par cette même instance plutôt que d'écouter chacun de leur côté.
let deferredPrompt = null;
const listeners = new Set();

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    listeners.forEach((cb) => cb(true));
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    listeners.forEach((cb) => cb(false));
  });
}

export function isInstallAvailable() {
  return !!deferredPrompt;
}

export function isStandalone() {
  return typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches;
}

export function onInstallAvailabilityChange(callback) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

export async function promptInstall() {
  if (!deferredPrompt) return { outcome: 'unavailable' };
  deferredPrompt.prompt();
  const choice = await deferredPrompt.userChoice;
  deferredPrompt = null;
  return choice;
}
