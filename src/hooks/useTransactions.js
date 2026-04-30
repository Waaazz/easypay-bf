import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
  limit,
  getDocs,
} from 'firebase/firestore';
import { db } from '../firebase/config';

// Mock user for development (no auth)
const MOCK_USER = { uid: 'demo-client-001' };
const MOCK_PROFILE = { uid: 'demo-client-001', name: 'Démo Client', phone: '+22600000000', role: 'client' };

/**
 * Hook for client transactions
 */
export function useClientTransactions() {
  const user = MOCK_USER;
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
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const txs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
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
 * Hook for agent - pending/processing orders
 */
export function useAgentTransactions() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const q = query(
      collection(db, 'transactions'),
      where('status', 'in', ['pending', 'processing']),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const txs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
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
  }, []);

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
        orderBy('createdAt', 'desc'),
        limit(100)
      );
    } else {
      q = query(
        collection(db, 'transactions'),
        orderBy('createdAt', 'desc'),
        limit(100)
      );
    }

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const txs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
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
  const user = MOCK_USER;
  const userProfile = MOCK_PROFILE;
  const [submitting, setSubmitting] = useState(false);

  const createTransaction = useCallback(async (data) => {
    setSubmitting(true);
    try {
      const txData = {
        ...data,
        clientId: user.uid,
        clientName: userProfile.name || userProfile.phone,
        agentId: null,
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
  }, [user, userProfile]);

  const acceptOrder = useCallback(async (transactionId) => {
    if (!user) return { success: false, error: 'Non authentifié' };
    try {
      const txRef = doc(db, 'transactions', transactionId);
      await updateDoc(txRef, {
        status: 'processing',
        agentId: user.uid,
        updatedAt: serverTimestamp(),
      });
      return { success: true };
    } catch (error) {
      console.error('Error accepting order:', error);
      return { success: false, error: error.message };
    }
  }, [user]);

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

  return { createTransaction, acceptOrder, completeOrder, cancelOrder, submitting };
}
