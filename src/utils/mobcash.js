// Client pour mobcash-service (automatisation MobCash côté 1xBet).
//
// ATTENTION SÉCURITÉ : VITE_MOBCASH_API_KEY finit dans le bundle JS public
// (comme toute variable VITE_*). C'est acceptable tant que mobcash-service
// tourne sur un réseau de confiance non exposé publiquement (dev local,
// réseau interne). Avant un vrai déploiement public, l'appel à /deposit
// (celui qui crédite un compte) doit passer par un backend de confiance
// (ex. Firebase Cloud Function) qui garde la clé secrète côté serveur —
// ne jamais l'appeler tel quel depuis un bundle client en production.
const BASE_URL = import.meta.env.VITE_MOBCASH_SERVICE_URL;
const API_KEY = import.meta.env.VITE_MOBCASH_API_KEY;

async function callMobcash(path, body) {
  if (!BASE_URL) {
    return { ok: false, unavailable: true, error: 'Service MobCash non configuré (VITE_MOBCASH_SERVICE_URL manquant).' };
  }
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': API_KEY || '' },
      body: JSON.stringify(body),
      // Le cycle complet (réveil écran, déverrouillage PIN si besoin,
      // navigation, saisie, vérification réseau côté MobCash) peut prendre
      // 20-40s en conditions réelles — marge large pour éviter les abandons
      // prématurés côté client pendant que l'opération continue sur le téléphone.
      signal: AbortSignal.timeout(120000),
    });
    const data = await res.json();
    if (!res.ok) return { ok: false, unavailable: false, error: data.error || 'Erreur du service MobCash.' };
    return { ok: true, data };
  } catch (error) {
    // Service injoignable (téléphone éteint, réseau coupé, etc.) — distinct
    // d'une vraie erreur métier pour permettre une dégradation gracieuse.
    return { ok: false, unavailable: true, error: error.message };
  }
}

export async function mobcashInquiry(webUserId) {
  return callMobcash('/inquiry', { webUserId });
}

export async function mobcashDeposit(webUserId, amount) {
  return callMobcash('/deposit', { webUserId, amount });
}
