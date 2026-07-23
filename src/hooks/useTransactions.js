import { useState, useEffect, useCallback, useRef } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  updateDoc,
  doc,
  getDocs,
  setDoc,
  serverTimestamp,
  limit,
  runTransaction,
} from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import { notifyNewOrder } from '../utils/notifications';
import { formatCFA } from '../utils/formatters';
import { useAuth } from './useAuth';

/**
 * Construit la map des numéros actifs depuis les agents Firestore.
 * Un agent est assignable si active=true ET available=true ET a des numéros configurés.
 */
export async function getActiveNumbers() {
  try {
    const q = query(
      collection(db, 'users'),
      where('role', '==', 'agent'),
      where('active', '==', true),
      where('available', '==', true)
    );
    const snap = await getDocs(q);
    const result = {};
    snap.docs.forEach(d => {
      const { operators, name } = d.data();
      const uid = d.id;
      if (!operators) return;
      Object.entries(operators).forEach(([opId, number]) => {
        if (!number) return;
        if (!result[opId]) result[opId] = [];
        result[opId].push({ agentId: uid, agentName: name || 'Agent', number });
      });
    });
    return Object.keys(result).length > 0 ? result : null;
  } catch {
    return null;
  }
}

/**
 * L'agent bascule sa propre disponibilité (available).
 * availabilityChangedAt permet à l'admin d'afficher depuis quand un agent
 * est indisponible (ou disponible), indépendamment des autres mises à jour
 * du profil qui touchent updatedAt.
 */
export async function setAgentAvailability(uid, available) {
  await updateDoc(doc(db, 'users', uid), {
    available,
    availabilityChangedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

/**
 * Hook for client transactions
 */
export function useClientTransactions() {
  // Réutilise l'état d'authentification d'AuthContext plutôt que de tenir sa
  // propre écoute onAuthStateChanged : celle-ci n'a pas la protection contre
  // l'évènement anonyme fantôme que Firebase peut émettre après une vraie
  // connexion, et retomberait silencieusement sur le mauvais uid.
  const { user } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user) {
      setTransactions([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'transactions'),
      where('clientId', '==', user.uid),
      limit(50)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const txs = snapshot.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        setTransactions(txs);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Error fetching transactions:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  return { transactions, loading, error };
}

/**
 * Hook for agent — only transactions assigned to this agent
 */
export function useAgentTransactions() {
  // Réutilise l'état d'authentification d'AuthContext plutôt que de tenir sa
  // propre écoute onAuthStateChanged : celle-ci n'a pas la protection contre
  // l'évènement anonyme fantôme que Firebase peut émettre après une vraie
  // connexion, et retomberait silencieusement sur le mauvais uid — un agent
  // pouvait alors voir un tableau de bord vide jusqu'à rechargement complet.
  const { user } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Ids déjà vus (tous statuts confondus), pour détecter les commandes
  // réellement nouvelles et notifier l'agent — null tant que le tout premier
  // instantané n'est pas arrivé, pour ne pas notifier les commandes déjà là
  // au chargement de la page.
  const knownIdsRef = useRef(null);

  useEffect(() => {
    knownIdsRef.current = null;
    if (!user) { setLoading(false); return; }

    // Deux écoutes séparées fusionnées côté client : Firestore ne matche jamais
    // `null` via l'opérateur `in` (même listé dans le tableau), donc
    // `where('assignedAgentId', 'in', [uid, null])` ignore silencieusement
    // toutes les transactions non assignées (ex. tous les retraits).
    const results = { mine: [], unassigned: [] };
    const active = ['pending', 'awaiting_confirmation', 'processing'];

    const merge = () => {
      const byId = new Map();
      [...results.mine, ...results.unassigned].forEach((t) => byId.set(t.id, t));
      const all = Array.from(byId.values());
      const txs = all
        .filter((t) => active.includes(t.status))
        .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

      if (knownIdsRef.current) {
        const freshOrders = txs.filter((t) => t.status === 'pending' && !knownIdsRef.current.has(t.id));
        freshOrders.forEach((t) => notifyNewOrder(t, formatCFA));
      }
      knownIdsRef.current = new Set(all.map((t) => t.id));

      setTransactions(txs);
      setLoading(false);
      setError(null);
    };

    const onErr = (err) => {
      console.error('Error fetching agent transactions:', err);
      setError(err.message);
      setLoading(false);
    };

    const qMine = query(collection(db, 'transactions'), where('assignedAgentId', '==', user.uid));
    const qUnassigned = query(collection(db, 'transactions'), where('assignedAgentId', '==', null));

    const unsubMine = onSnapshot(qMine, (snap) => {
      results.mine = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      merge();
    }, onErr);

    const unsubUnassigned = onSnapshot(qUnassigned, (snap) => {
      results.unassigned = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      merge();
    }, onErr);

    return () => {
      unsubMine();
      unsubUnassigned();
    };
  }, [user]);

  return { transactions, loading, error };
}

/**
 * Hook for admin - all transactions
 */
export function useAdminTransactions(statusFilter = null) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let q;
    if (statusFilter) {
      q = query(
        collection(db, 'transactions'),
        where('status', '==', statusFilter),
        limit(100)
      );
    } else {
      q = query(
        collection(db, 'transactions'),
        limit(100)
      );
    }

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const txs = snapshot.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        setTransactions(txs);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Error fetching admin transactions:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [statusFilter]);

  return { transactions, loading, error };
}

/**
 * Hook for transaction actions
 */
export function useTransactionActions() {
  const [submitting, setSubmitting] = useState(false);

  const createTransaction = useCallback(async (data) => {
    setSubmitting(true);
    try {
      const txData = {
        assignedAgentId: null,
        ...data,
        clientId: auth.currentUser?.uid || 'anonymous',
        clientName: auth.currentUser?.displayName || auth.currentUser?.phoneNumber || 'Client',
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        note: null,
      };
      const docRef = await addDoc(collection(db, 'transactions'), txData);
      return { success: true, id: docRef.id };
    } catch (error) {
      console.error('Error creating transaction:', error);
      return { success: false, error: error.message };
    } finally {
      setSubmitting(false);
    }
  }, []);

  const confirmPayment = useCallback(async (transactionId) => {
    try {
      const txRef = doc(db, 'transactions', transactionId);
      await updateDoc(txRef, {
        status: 'awaiting_confirmation',
        updatedAt: serverTimestamp(),
      });
      return { success: true };
    } catch (error) {
      console.error('Error confirming payment:', error);
      return { success: false, error: error.message };
    }
  }, []);

  // Traite une commande en un seul clic : réserve ET termine dans la même
  // transaction Firestore atomique (au lieu de accepter puis terminer en deux
  // temps). Garde la même protection contre le double-traitement — utile tant
  // que des retraits sans agent disponible retombent en diffusion à tous.
  const processOrder = useCallback(async (transactionId, agentName) => {
    const txRef = doc(db, 'transactions', transactionId);
    const agentId = auth.currentUser?.uid;
    if (!agentId) return { success: false, error: 'Non authentifié.' };

    try {
      await runTransaction(db, async (firestoreTx) => {
        const snap = await firestoreTx.get(txRef);
        if (!snap.exists()) throw new Error('Demande introuvable.');

        const data = snap.data();
        const claimable = ['pending', 'awaiting_confirmation'];
        if (!claimable.includes(data.status)) {
          throw new Error(
            data.agentName
              ? `Déjà prise en charge par ${data.agentName}.`
              : 'Cette demande a déjà été prise en charge par un autre agent.'
          );
        }

        firestoreTx.update(txRef, {
          status: 'completed',
          agentId,
          agentName: agentName || 'Agent',
          updatedAt: serverTimestamp(),
        });
      });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }, []);

  const completeOrder = useCallback(async (transactionId) => {
    try {
      const txRef = doc(db, 'transactions', transactionId);
      await updateDoc(txRef, {
        status: 'completed',
        updatedAt: serverTimestamp(),
      });
      return { success: true };
    } catch (error) {
      console.error('Error completing order:', error);
      return { success: false, error: error.message };
    }
  }, []);

  const cancelOrder = useCallback(async (transactionId, reason, agentName) => {
    try {
      const txRef = doc(db, 'transactions', transactionId);
      await updateDoc(txRef, {
        status: 'cancelled',
        note: reason || 'Annulé',
        // Attribue l'annulation à l'agent qui l'a effectuée, pour permettre
        // un suivi du taux d'annulation par agent côté admin.
        agentId: auth.currentUser?.uid || null,
        agentName: agentName || 'Agent',
        updatedAt: serverTimestamp(),
      });
      return { success: true };
    } catch (error) {
      console.error('Error cancelling order:', error);
      return { success: false, error: error.message };
    }
  }, []);

  return { createTransaction, confirmPayment, processOrder, completeOrder, cancelOrder, submitting };
}
