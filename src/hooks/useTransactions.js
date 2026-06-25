import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  updateDoc,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  limit,
  runTransaction,
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth } from '../firebase/config';

/**
 * Lit le document public /config/activeNumbers.
 * Structure : { orange: { number, agentId, agentName }, telmob: {...}, telecel: {...} }
 * Accessible par tous (pas besoin d'authentification si les règles Firestore le permettent).
 */
export async function getActiveNumbers() {
  try {
    const snap = await getDoc(doc(db, 'config', 'activeNumbers'));
    return snap.exists() ? snap.data() : null;
  } catch {
    return null;
  }
}

/**
 * Met à jour /config/activeNumbers pour un opérateur donné.
 * Appelé par l'admin quand il active un agent pour un opérateur.
 */
// Active ou désactive un agent pour TOUS ses opérateurs en une seule transaction
export async function setAgentAvailability(agentId, agentName, operators, available) {
  const configRef = doc(db, 'config', 'activeNumbers');
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(configRef);
    const data = snap.exists() ? snap.data() : {};
    const updated = { ...data };

    for (const [opId, number] of Object.entries(operators)) {
      if (!number) continue;
      const raw = updated[opId];
      const currentList = Array.isArray(raw) ? raw : (raw ? [raw] : []);

      if (available) {
        if (!currentList.some(a => a.agentId === agentId)) {
          updated[opId] = [...currentList, { agentId, agentName, number }];
        }
      } else {
        updated[opId] = currentList.filter(a => a.agentId !== agentId);
      }
    }

    tx.set(configRef, { ...updated, updatedAt: serverTimestamp() });
  });
}

// Toggle : ajoute ou retire l'agent du tableau des actifs pour cet opérateur
export async function setActiveAgent(operatorId, agentId, agentName, number) {
  const configRef = doc(db, 'config', 'activeNumbers');
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(configRef);
    const data = snap.exists() ? snap.data() : {};
    // Compatibilité avec l'ancienne structure objet
    const raw = data[operatorId];
    const currentList = Array.isArray(raw) ? raw : (raw ? [raw] : []);

    const alreadyActive = currentList.some(a => a.agentId === agentId);
    const newList = alreadyActive
      ? currentList.filter(a => a.agentId !== agentId)       // désactiver
      : [...currentList, { agentId, agentName, number }];    // activer

    tx.set(configRef, { ...data, [operatorId]: newList, updatedAt: serverTimestamp() });
  });
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
