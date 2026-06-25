import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
  limit,
  runTransaction,
  getDocs,
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth } from '../firebase/config';

/**
 * Sélectionne l'agent le moins chargé parmi ceux qui gèrent l'opérateur donné.
 * Retourne l'objet agent (uid + operators + ...) ou null si aucun disponible.
 */
export async function getAvailableAgent(operatorId) {
  // Récupère tous les agents actifs (requête champ unique → pas d'index composite)
  const agentsSnap = await getDocs(
    query(collection(db, 'users'), where('role', '==', 'agent'))
  );

  const eligible = agentsSnap.docs
    .map(d => ({ uid: d.id, ...d.data() }))
    .filter(a => a.active && a.operators?.[operatorId]);

  if (eligible.length === 0) return null;
  if (eligible.length === 1) return eligible[0];

  // Compte les transactions actives de chaque agent (filtre client-side pour éviter index composite)
  const counts = await Promise.all(
    eligible.map(async (agent) => {
      const snap = await getDocs(
        query(collection(db, 'transactions'), where('assignedAgentId', '==', agent.uid))
      );
      const active = snap.docs.filter(d =>
        ['pending', 'awaiting_confirmation', 'processing'].includes(d.data().status)
      ).length;
      return { agent, count: active };
    })
  );

  counts.sort((a, b) => a.count - b.count);
  return counts[0].agent;
}

/**
 * Hook for client transactions
 */
export function useClientTransactions() {
  const [user, setUser] = useState(auth.currentUser);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    return onAuthStateChanged(auth, (firebaseUser) => setUser(firebaseUser));
  }, []);

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
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(auth.currentUser);

  useEffect(() => {
    return onAuthStateChanged(auth, u => setUser(u));
  }, []);

  useEffect(() => {
    if (!user) { setLoading(false); return; }

    // Transactions assignées à cet agent OU non-assignées (null = avant configuration opérateurs)
    // `in` sur un seul champ → pas d'index composite requis
    const q = query(
      collection(db, 'transactions'),
      where('assignedAgentId', 'in', [user.uid, null])
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const active = ['pending', 'awaiting_confirmation', 'processing'];
        const txs = snapshot.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((t) => active.includes(t.status))
          .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        setTransactions(txs);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Error fetching agent transactions:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
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

  const acceptOrder = useCallback(async (transactionId, agentName) => {
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
          status: 'processing',
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

  const cancelOrder = useCallback(async (transactionId, reason) => {
    try {
      const txRef = doc(db, 'transactions', transactionId);
      await updateDoc(txRef, {
        status: 'cancelled',
        note: reason || 'Annulé',
        updatedAt: serverTimestamp(),
      });
      return { success: true };
    } catch (error) {
      console.error('Error cancelling order:', error);
      return { success: false, error: error.message };
    }
  }, []);

  return { createTransaction, confirmPayment, acceptOrder, completeOrder, cancelOrder, submitting };
}
