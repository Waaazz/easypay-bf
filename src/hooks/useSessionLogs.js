import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, limit } from 'firebase/firestore';
import { db } from '../firebase/config';

/**
 * Historique de connexion/déconnexion d'une personne (agent/caissier/
 * superviseur/admin), triés du plus récent au plus ancien — tri fait côté
 * client pour éviter un index composite juste pour ce tri.
 */
export function useSessionLogs(uid, max = 10) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) { setLogs([]); setLoading(false); return; }
    const q = query(collection(db, 'sessionLogs'), where('uid', '==', uid), limit(50));
    const unsubscribe = onSnapshot(q, (snap) => {
      const all = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.startedAt?.toMillis?.() || 0) - (a.startedAt?.toMillis?.() || 0));
      setLogs(all.slice(0, max));
      setLoading(false);
    }, () => setLoading(false));
    return unsubscribe;
  }, [uid, max]);

  return { logs, loading };
}
