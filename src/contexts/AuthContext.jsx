import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously,
  signOut,
  onAuthStateChanged,
  linkWithCredential,
  EmailAuthProvider,
  updatePassword,
  updateEmail,
  reauthenticateWithCredential,
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp, addDoc, collection } from 'firebase/firestore';
import { auth, db, secondaryAuth } from '../firebase/config';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  // Empêche le re-login anonyme automatique pendant une connexion intentionnelle
  const signingIn = React.useRef(false);
  // uid de la session réelle (non anonyme) en cours, dès qu'on en établit une —
  // mis à jour de façon synchrone (avant tout onAuthStateChanged) par les
  // fonctions de connexion ci-dessous. Sert à ignorer les évènements anonymes
  // fantômes que Firebase peut émettre pendant/après une connexion réelle,
  // dans un ordre non garanti (voir onAuthStateChanged plus bas).
  const realUidRef = React.useRef(null);
  // Id du sessionLogs en cours (connexion non encore close), pour pouvoir le
  // clôturer précisément à la déconnexion sans avoir à le rechercher.
  const sessionLogIdRef = React.useRef(null);

  // Trace les heures de connexion/déconnexion (agent/caissier/superagent/
  // admin) pour que l'admin puisse voir "heure de début et de descente" de
  // chaque membre de l'équipe — best-effort, ne doit jamais faire échouer
  // une connexion/déconnexion si l'écriture échoue.
  const startSessionLog = async (uid) => {
    try {
      const ref = await addDoc(collection(db, 'sessionLogs'), {
        uid,
        startedAt: serverTimestamp(),
        endedAt: null,
      });
      sessionLogIdRef.current = ref.id;
    } catch (_) {
      sessionLogIdRef.current = null;
    }
  };

  const endSessionLog = async () => {
    const logId = sessionLogIdRef.current;
    sessionLogIdRef.current = null;
    if (!logId) return;
    try {
      await updateDoc(doc(db, 'sessionLogs', logId), { endedAt: serverTimestamp() });
    } catch (_) {
      // best-effort
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        if (firebaseUser.isAnonymous) {
          // Une session réelle est déjà (ou est en train d'être) établie :
          // cet évènement anonyme est fantôme/obsolète, on l'ignore entièrement
          // (y compris la mise à jour du profil) pour ne rien écraser.
          if (realUidRef.current) {
            return;
          }
        } else {
          realUidRef.current = firebaseUser.uid;
        }
        setUser(firebaseUser);
        try {
          const profile = await fetchUserProfile(firebaseUser.uid);
          setUserProfile(profile);
        } catch (err) {
          console.error('Error fetching user profile:', err);
        }
        setLoading(false);
      } else {
        realUidRef.current = null;
        setUser(null);
        setUserProfile(null);
        // Si une connexion est en cours, ne pas relancer signInAnonymously
        if (signingIn.current) {
          setLoading(false);
          return;
        }
        // Pas d'utilisateur → connexion anonyme automatique pour persister l'historique
        try {
          await signInAnonymously(auth);
        } catch (err) {
          console.error('Error signing in anonymously:', err);
          setLoading(false);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const fetchUserProfile = async (uid) => {
    const docRef = doc(db, 'users', uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { uid, ...docSnap.data() };
    }
    return null;
  };

  const updateUserProfile = async (data) => {
    if (!user) return { success: false, error: 'Non authentifié' };
    try {
      const docRef = doc(db, 'users', user.uid);
      await setDoc(docRef, { ...data, updatedAt: serverTimestamp() }, { merge: true });
      const updated = await fetchUserProfile(user.uid);
      setUserProfile(updated);
      return { success: true };
    } catch (error) {
      console.error('Error updating profile:', error);
      return { success: false, error: error.message };
    }
  };

  // ── Emails synthétiques par numéro de téléphone, namespacés par rôle ────
  // (toujours utilisé pour l'agent et le client, qui se connectent par numéro)
  const PHONE_EMAIL_DOMAIN = {
    agent: 'easypay-agent.bf',
    client: 'easypay-client.bf',
    caissier: 'apollonpay-caissier.bf',
    superagent: 'apollonpay-superagent.bf',
  };
  const phoneToEmail = (phone, ns = 'agent') => {
    const digits = phone.replace(/\D/g, '');
    const normalized = digits.startsWith('226') ? digits : `226${digits}`;
    return `${normalized}@${PHONE_EMAIL_DOMAIN[ns]}`;
  };

  // ── Emails synthétiques par nom d'utilisateur — caissier/SuperAgent ──────
  // Ces deux rôles se connectent par nom d'utilisateur + mot de passe (rôles
  // neufs, pas de compte existant à migrer — contrairement à l'agent qui
  // garde son login par numéro pour ne pas casser les comptes en place). Le
  // nom d'utilisateur n'est pas un email valide en soi : on le fait suivre
  // d'un domaine interne namespacé par rôle, exactement comme phoneToEmail,
  // mais l'email réel utilisé pour l'auth Firebase est résolu via la
  // collection `usernames` (voir lookupEmailByUsername) plutôt que recalculé
  // à chaque connexion — ce qui permettrait d'assigner un username à un
  // compte existant sans jamais toucher à son email Firebase Auth.
  const normalizeUsername = (username) =>
    (username || '').trim().toLowerCase().replace(/[^a-z0-9._-]/g, '');
  const usernameToEmail = (username, ns = 'agent') =>
    `${normalizeUsername(username)}@${PHONE_EMAIL_DOMAIN[ns]}`;

  const lookupEmailByUsername = async (username) => {
    const snap = await getDoc(doc(db, 'usernames', normalizeUsername(username)));
    return snap.exists() ? snap.data().email : null;
  };

  // Connexion générique par nom d'utilisateur, partagée par caissier/
  // SuperAgent — seul le rôle et le message d'erreur changent.
  const loginWithUsername = async (username, password) => {
    signingIn.current = true;
    try {
      const email = await lookupEmailByUsername(username);
      if (!email) {
        signingIn.current = false;
        return { success: false, error: "Nom d'utilisateur ou mot de passe incorrect." };
      }
      const result = await signInWithEmailAndPassword(auth, email, password);
      realUidRef.current = result.user.uid;
      setUser(result.user);
      // Trace la dernière connexion pour le suivi admin — best-effort, ne
      // doit pas faire échouer la connexion si l'écriture échoue.
      updateDoc(doc(db, 'users', result.user.uid), { lastLoginAt: serverTimestamp() }).catch(() => {});
      await startSessionLog(result.user.uid);
      signingIn.current = false;
      return { success: true };
    } catch {
      signingIn.current = false;
      return { success: false, error: "Nom d'utilisateur ou mot de passe incorrect." };
    }
  };

  // ── Connexion caissier (nom d'utilisateur + mot de passe) ────────────────
  const loginCaissier = (username, password) => loginWithUsername(username, password);

  // ── Connexion SuperAgent (nom d'utilisateur + mot de passe) ──────────────
  const loginSuperAgent = (username, password) => loginWithUsername(username, password);

  // ── Changement de mot de passe par l'utilisateur connecté (agent/caissier) ──
  // Nécessite une session récente : on ré-authentifie avec le mot de passe
  // actuel avant d'appliquer le nouveau, sinon Firebase rejette l'opération
  // avec auth/requires-recent-login.
  const changeOwnPassword = async (currentPassword, newPassword) => {
    if (!auth.currentUser?.email) return { success: false, error: 'Non authentifié.' };
    try {
      const credential = EmailAuthProvider.credential(auth.currentUser.email, currentPassword);
      await reauthenticateWithCredential(auth.currentUser, credential);
      await updatePassword(auth.currentUser, newPassword);
      return { success: true };
    } catch (error) {
      const msg = error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password'
        ? 'Mot de passe actuel incorrect.'
        : error.code === 'auth/weak-password'
          ? 'Le nouveau mot de passe doit contenir au moins 6 caractères.'
          : 'Erreur lors du changement de mot de passe.';
      return { success: false, error: msg };
    }
  };

  // ── Changement d'email par l'utilisateur connecté (admin) ────────────────
  // Même principe que changeOwnPassword : ré-authentification obligatoire
  // avant de modifier l'email Firebase Auth, puis on garde la fiche
  // Firestore synchronisée (c'est elle qui est affichée dans la liste des
  // admins, pas l'email Auth directement).
  const changeOwnEmail = async (currentPassword, newEmail) => {
    if (!auth.currentUser?.email) return { success: false, error: 'Non authentifié.' };
    try {
      const credential = EmailAuthProvider.credential(auth.currentUser.email, currentPassword);
      await reauthenticateWithCredential(auth.currentUser, credential);
      await updateEmail(auth.currentUser, newEmail);
      await updateDoc(doc(db, 'users', auth.currentUser.uid), { email: newEmail });
      return { success: true };
    } catch (error) {
      const msg = error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password'
        ? 'Mot de passe actuel incorrect.'
        : error.code === 'auth/email-already-in-use'
          ? 'Cet email est déjà utilisé par un autre compte.'
          : error.code === 'auth/invalid-email'
            ? 'Adresse email invalide.'
            : "Erreur lors du changement d'email.";
      return { success: false, error: msg };
    }
  };

  // Un agent se connecte historiquement par numéro ; les agents créés plus
  // récemment ont en plus un nom d'utilisateur (voir createAgentAccount /
  // UsernameAssign pour les comptes migrés). On détecte l'identifiant saisi
  // pour router vers le bon flux SANS jamais casser le login par numéro des
  // agents existants — un identifiant majoritairement numérique (8+ chiffres)
  // est traité comme un numéro, sinon comme un nom d'utilisateur.
  const loginAgent = async (identifier, password) => {
    const digits = identifier.replace(/\D/g, '');
    const looksLikePhone = digits.length >= 8;

    if (!looksLikePhone) {
      return loginWithUsername(identifier, password);
    }

    const email = phoneToEmail(identifier, 'agent');
    signingIn.current = true;
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      realUidRef.current = result.user.uid;
      setUser(result.user);
      // Trace la dernière connexion pour le suivi admin — best-effort, ne
      // doit pas faire échouer la connexion si l'écriture échoue.
      updateDoc(doc(db, 'users', result.user.uid), { lastLoginAt: serverTimestamp() }).catch(() => {});
      await startSessionLog(result.user.uid);
      signingIn.current = false;
      return { success: true };
    } catch {
      signingIn.current = false;
      return { success: false, error: 'Numéro ou mot de passe incorrect.' };
    }
  };

  // ── Connexion admin (email + mot de passe) ──────────────────────────────
  const loginAdmin = async (email, password) => {
    signingIn.current = true;
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      realUidRef.current = result.user.uid;
      setUser(result.user);
      await startSessionLog(result.user.uid);
      signingIn.current = false;
      return { success: true };
    } catch {
      signingIn.current = false;
      return { success: false, error: 'Email ou mot de passe incorrect.' };
    }
  };

  // ── Inscription client (numéro + mot de passe) ──────────────────────────
  // Si le client navigue déjà en anonyme, on lie le mot de passe à cette
  // session pour conserver l'UID (et donc l'historique déjà créé en invité).
  const registerClient = async (name, phone, password) => {
    const email = phoneToEmail(phone, 'client');
    const digits = phone.replace(/\D/g, '');
    const normalized = digits.startsWith('226') ? digits : `226${digits}`;
    const formattedPhone = `+${normalized}`;

    signingIn.current = true;
    try {
      let uid;
      if (auth.currentUser?.isAnonymous) {
        const credential = EmailAuthProvider.credential(email, password);
        const result = await linkWithCredential(auth.currentUser, credential);
        uid = result.user.uid;
        realUidRef.current = uid;
        setUser(result.user);
      } else {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        uid = result.user.uid;
        realUidRef.current = uid;
        setUser(result.user);
      }

      await setDoc(doc(db, 'users', uid), {
        uid,
        name: name.trim(),
        phone: formattedPhone,
        email,
        role: 'client',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }, { merge: true });

      const profile = await fetchUserProfile(uid);
      setUserProfile(profile);
      signingIn.current = false;
      return { success: true };
    } catch (error) {
      signingIn.current = false;
      const msg = ['auth/email-already-in-use', 'auth/credential-already-in-use'].includes(error.code)
        ? 'Un compte existe déjà avec ce numéro. Connectez-vous plutôt.'
        : error.code === 'auth/weak-password'
          ? 'Le mot de passe doit contenir au moins 6 caractères.'
          : 'Erreur lors de la création du compte.';
      return { success: false, error: msg };
    }
  };

  // ── Connexion client (numéro + mot de passe) ─────────────────────────────
  const loginClient = async (phone, password) => {
    const email = phoneToEmail(phone, 'client');
    signingIn.current = true;
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      realUidRef.current = result.user.uid;
      setUser(result.user);
      const profile = await fetchUserProfile(result.user.uid);
      setUserProfile(profile);
      signingIn.current = false;
      return { success: true };
    } catch {
      signingIn.current = false;
      return { success: false, error: 'Numéro ou mot de passe incorrect.' };
    }
  };

  // Validation + réservation d'un nom d'utilisateur, partagée par les
  // fonctions de création de compte ci-dessous. Le namespace est global
  // (une seule collection `usernames`) : un nom pris par un caissier ne peut
  // pas être repris par un SuperAgent, pour éviter qu'une écriture
  // postérieure n'écrase silencieusement le pointeur email d'un autre compte.
  const reserveUsername = async (username, role) => {
    const normalized = normalizeUsername(username);
    if (normalized.length < 3) {
      throw { code: 'username/invalid', message: "Le nom d'utilisateur doit contenir au moins 3 caractères (lettres, chiffres, . _ -)." };
    }
    const existing = await getDoc(doc(db, 'usernames', normalized));
    if (existing.exists()) {
      throw { code: 'username/taken', message: "Ce nom d'utilisateur est déjà pris." };
    }
    return normalized;
  };

  // ── Création compte agent par l'admin ────────────────────────────────────
  // operators = { orange: '07XXXXXX', telmob: '60XXXXXX', telecel: '55XXXXXX' }
  // username (optionnel) : l'agent pourra alors se connecter par numéro OU
  // par nom d'utilisateur (voir loginAgent) — le compte Firebase Auth reste
  // créé par numéro comme avant, le username n'est qu'un pointeur en plus.
  const createAgentAccount = async (name, phone, password, operators = {}, username = '') => {
    const email = phoneToEmail(phone, 'agent');
    const digits = phone.replace(/\D/g, '');
    const normalized = digits.startsWith('226') ? digits : `226${digits}`;
    const formattedPhone = `+${normalized}`;

    // Nettoie les opérateurs vides
    const cleanOperators = Object.fromEntries(
      Object.entries(operators).filter(([, v]) => v && v.trim())
    );

    let normalizedUsername = null;
    if (username && username.trim()) {
      try {
        normalizedUsername = await reserveUsername(username, 'agent');
      } catch (error) {
        return { success: false, error: error.message || "Nom d'utilisateur invalide." };
      }
    }

    try {
      const userCred = await createUserWithEmailAndPassword(secondaryAuth, email, password);
      const newUid = userCred.user.uid;

      await setDoc(doc(db, 'users', newUid), {
        uid: newUid,
        name,
        phone: formattedPhone,
        email,
        role: 'agent',
        active: true,
        operators: cleanOperators,
        username: normalizedUsername || null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      if (normalizedUsername) {
        await setDoc(doc(db, 'usernames', normalizedUsername), { email, role: 'agent' });
      }

      await signOut(secondaryAuth);
      return { success: true };
    } catch (error) {
      const msg = error.code === 'auth/email-already-in-use'
        ? 'Un agent avec ce numéro existe déjà.'
        : error.message;
      return { success: false, error: msg };
    }
  };

  // ── Création compte caissier par l'admin ─────────────────────────────────
  // Rôle distinct de l'agent — pas de numéros Mobile Money assignés, le
  // caissier se connecte sur /caissier/login (voir loginCaissier).
  const createCaissierAccount = async (name, username, phone, password) => {
    const digits = phone.replace(/\D/g, '');
    const normalized = digits.startsWith('226') ? digits : `226${digits}`;
    const formattedPhone = `+${normalized}`;

    try {
      const normalizedUsername = await reserveUsername(username, 'caissier');
      const email = usernameToEmail(normalizedUsername, 'caissier');
      const userCred = await createUserWithEmailAndPassword(secondaryAuth, email, password);
      const newUid = userCred.user.uid;

      await setDoc(doc(db, 'users', newUid), {
        uid: newUid,
        name,
        username: normalizedUsername,
        phone: formattedPhone,
        email,
        role: 'caissier',
        active: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      await setDoc(doc(db, 'usernames', normalizedUsername), { email, role: 'caissier' });

      await signOut(secondaryAuth);
      return { success: true };
    } catch (error) {
      const msg = error.code === 'username/invalid' || error.code === 'username/taken'
        ? error.message
        : error.code === 'auth/email-already-in-use'
          ? 'Un caissier avec ce nom d\'utilisateur existe déjà.'
          : error.message;
      return { success: false, error: msg };
    }
  };

  // ── Création compte SuperAgent par l'admin ───────────────────────────────
  // Rôle de supervision, sans numéros Mobile Money ni traitement direct de
  // commandes — se connecte sur /superagent/login.
  const createSuperAgentAccount = async (name, username, phone, password) => {
    const digits = phone.replace(/\D/g, '');
    const normalized = digits.startsWith('226') ? digits : `226${digits}`;
    const formattedPhone = `+${normalized}`;

    try {
      const normalizedUsername = await reserveUsername(username, 'superagent');
      const email = usernameToEmail(normalizedUsername, 'superagent');
      const userCred = await createUserWithEmailAndPassword(secondaryAuth, email, password);
      const newUid = userCred.user.uid;

      await setDoc(doc(db, 'users', newUid), {
        uid: newUid,
        name,
        username: normalizedUsername,
        phone: formattedPhone,
        email,
        role: 'superagent',
        active: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      await setDoc(doc(db, 'usernames', normalizedUsername), { email, role: 'superagent' });

      await signOut(secondaryAuth);
      return { success: true };
    } catch (error) {
      const msg = error.code === 'username/invalid' || error.code === 'username/taken'
        ? error.message
        : error.code === 'auth/email-already-in-use'
          ? 'Un Superviseur avec ce nom d\'utilisateur existe déjà.'
          : error.message;
      return { success: false, error: msg };
    }
  };

  // ── Création compte admin adjoint par l'admin principal ──────────────────
  // Se connecte comme l'admin principal, sur /admin/login avec email + mot
  // de passe — mais isPrincipal: false le prive (via les règles Firestore)
  // de créer/modifier d'autres comptes admin, et l'UI lui masque le Dashboard
  // et la gestion des admins. La règle Firestore users.create revérifie déjà
  // côté serveur que seul un principal peut créer role:'admin' ; ce contrôle
  // client n'est qu'un confort d'UX (message d'erreur clair avant l'appel).
  const createAdjointAdminAccount = async (name, email, password) => {
    if (!userProfile || userProfile.role !== 'admin' || userProfile.isPrincipal === false) {
      return { success: false, error: 'Seul un admin principal peut créer un admin adjoint.' };
    }
    try {
      const userCred = await createUserWithEmailAndPassword(secondaryAuth, email, password);
      const newUid = userCred.user.uid;

      await setDoc(doc(db, 'users', newUid), {
        uid: newUid,
        name,
        email,
        role: 'admin',
        isPrincipal: false,
        active: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      await signOut(secondaryAuth);
      return { success: true };
    } catch (error) {
      const msg = error.code === 'auth/email-already-in-use'
        ? 'Un compte existe déjà avec cet email.'
        : error.code === 'auth/invalid-email'
          ? 'Email invalide.'
          : error.code === 'auth/weak-password'
            ? 'Le mot de passe doit contenir au moins 6 caractères.'
            : error.message;
      return { success: false, error: msg };
    }
  };

  // ── Assignation d'un nom d'utilisateur à un compte existant (migration) ──
  // Pour un compte caissier/SuperAgent (ou agent) créé sans nom d'utilisateur,
  // ou dont on veut changer le username : associe un username à l'email déjà
  // en place, SANS toucher à l'auth Firebase ni au mot de passe existant.
  const assignUsername = async (uid, role, username) => {
    try {
      const profileSnap = await getDoc(doc(db, 'users', uid));
      if (!profileSnap.exists() || !profileSnap.data().email) {
        return { success: false, error: 'Compte introuvable.' };
      }
      const email = profileSnap.data().email;
      const normalizedUsername = await reserveUsername(username, role);

      await setDoc(doc(db, 'usernames', normalizedUsername), { email, role });
      await updateDoc(doc(db, 'users', uid), { username: normalizedUsername, updatedAt: serverTimestamp() });
      return { success: true };
    } catch (error) {
      const msg = error.code === 'username/invalid' || error.code === 'username/taken'
        ? error.message
        : error.message || "Erreur lors de l'assignation du nom d'utilisateur.";
      return { success: false, error: msg };
    }
  };

  const logout = async () => {
    // Laisse le re-login anonyme se faire normalement après déconnexion
    signingIn.current = false;
    realUidRef.current = null;
    // Clôture le sessionLogs pendant qu'on est encore authentifié — la règle
    // Firestore exige request.auth.uid == uid du log, donc après signOut ça
    // échouerait silencieusement.
    await endSessionLog();
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const value = {
    user,
    userProfile,
    loading,
    loginAgent,
    loginAdmin,
    loginCaissier,
    loginSuperAgent,
    registerClient,
    loginClient,
    createAgentAccount,
    createCaissierAccount,
    createSuperAgentAccount,
    createAdjointAdminAccount,
    assignUsername,
    changeOwnPassword,
    changeOwnEmail,
    logout,
    updateUserProfile,
    refreshProfile: () => user ? fetchUserProfile(user.uid).then(setUserProfile) : Promise.resolve(),
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
