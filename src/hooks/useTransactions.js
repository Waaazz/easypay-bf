import { useState, useEffect, useCallback, useRef } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  updateDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
  serverTimestamp,
  limit,
  runTransaction,
  writeBatch,
} from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import { notifyNewOrder, notifyAgentAssigned } from '../utils/notifications';
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
 *
 * En parallèle, journalise chaque bascule dans availabilityLogs (clôture de
 * l'entrée ouverte précédente via son id stocké sur le profil + ouverture
 * d'une nouvelle) pour permettre de calculer une durée cumulée
 * d'indisponibilité sur une période (tableau de bord SuperAgent). On stocke
 * l'id du log ouvert sur le profil plutôt que de le retrouver par requête,
 * pour éviter un index composite juste pour ce lookup.
 */
export async function setAgentAvailability(uid, available) {
  const userRef = doc(db, 'users', uid);
  const userSnap = await getDoc(userRef);
  const previousLogId = userSnap.exists() ? userSnap.data().currentAvailabilityLogId : null;

  const batch = writeBatch(db);

  if (previousLogId) {
    batch.update(doc(db, 'availabilityLogs', previousLogId), { endedAt: serverTimestamp() });
  }

  const newLogRef = doc(collection(db, 'availabilityLogs'));
  batch.set(newLogRef, {
    agentId: uid,
    status: available ? 'available' : 'unavailable',
    startedAt: serverTimestamp(),
    endedAt: null,
  });

  batch.update(userRef, {
    available,
    availabilityChangedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    currentAvailabilityLogId: newLogRef.id,
  });

  await batch.commit();
}

/**
 * Hook SuperAgent : agents de son équipe (users.superAgentId == son uid).
 */
export function useSuperAgentTeam() {
  const { user } = useAuth();
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    const q = query(collection(db, 'users'), where('superAgentId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snap) => {
      setAgents(snap.docs.map((d) => ({ uid: d.id, ...d.data() })));
      setLoading(false);
    }, () => setLoading(false));
    return unsubscribe;
  }, [user]);

  return { agents, loading };
}

/**
 * Hook SuperAgent : transactions de son équipe (affectées à OU traitées par
 * un agent supervisé), avec notification temps réel dès qu'une nouvelle
 * transaction est affectée à l'un de ses agents.
 *
 * Deux requêtes séparées fusionnées côté client (même schéma que
 * useAgentTransactions) : `assignedAgentId` couvre l'affectation initiale,
 * `agentId` couvre les commandes réclamées après diffusion (ex. retraits
 * sans agent dispo à la création) par un agent de l'équipe. Chaque requête
 * est filtrée par `where(... 'in', teamAgentIds)` pour rester alignée avec
 * la règle Firestore isTeamAgent() — une requête non filtrée échouerait
 * (Firestore rejette toute liste contenant un document non autorisé).
 */
export function useSuperAgentTransactions(teamAgentIds, agentNamesById = {}) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const knownIdsRef = useRef(null);
  // Ref plutôt que dépendance d'effet : agentNamesById est un nouvel objet à
  // chaque rendu du composant appelant, on ne veut pas resouscrire les
  // écoutes Firestore pour autant — seule la valeur au moment de la
  // notification nous intéresse.
  const agentNamesRef = useRef(agentNamesById);
  agentNamesRef.current = agentNamesById;

  const ids = (teamAgentIds || []).slice(0, 30);
  const idsKey = ids.join(',');

  useEffect(() => {
    knownIdsRef.current = null;

    if (ids.length === 0) {
      setTransactions([]);
      setLoading(false);
      return;
    }

    const results = { assigned: [], processed: [] };

    const merge = () => {
      const byId = new Map();
      [...results.assigned, ...results.processed].forEach((t) => byId.set(t.id, t));
      const all = Array.from(byId.values());
      const txs = all.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

      if (knownIdsRef.current) {
        const fresh = txs.filter((t) => t.status === 'pending' && !knownIdsRef.current.has(t.id));
        fresh.forEach((t) => notifyAgentAssigned(t, agentNamesRef.current[t.assignedAgentId], formatCFA));
      }
      knownIdsRef.current = new Set(all.map((t) => t.id));

      setTransactions(txs);
      setLoading(false);
    };

    const onErr = () => setLoading(false);

    const qAssigned = query(collection(db, 'transactions'), where('assignedAgentId', 'in', ids));
    const qProcessed = query(collection(db, 'transactions'), where('agentId', 'in', ids));

    const unsubAssigned = onSnapshot(qAssigned, (snap) => {
      results.assigned = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      merge();
    }, onErr);

    const unsubProcessed = onSnapshot(qProcessed, (snap) => {
      results.processed = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      merge();
    }, onErr);

    return () => {
      unsubAssigned();
      unsubProcessed();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey]);

  return { transactions, loading };
}

/**
 * Hook SuperAgent : historique des bascules de disponibilité (available <->
 * indisponible) des agents de son équipe — sert à calculer une durée
 * cumulée d'indisponibilité sur une période (voir utils/availability.js).
 */
export function useTeamAvailabilityLogs(teamAgentIds) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const ids = (teamAgentIds || []).slice(0, 30);
  const idsKey = ids.join(',');

  useEffect(() => {
    if (ids.length === 0) {
      setLogs([]);
      setLoading(false);
      return;
    }
    const q = query(collection(db, 'availabilityLogs'), where('agentId', 'in', ids));
    const unsubscribe = onSnapshot(q, (snap) => {
      setLogs(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, () => setLoading(false));
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey]);

  return { logs, loading };
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
