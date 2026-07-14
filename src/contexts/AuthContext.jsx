import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously,
  signOut,
  onAuthStateChanged,
  linkWithCredential,
  EmailAuthProvider,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
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
  const PHONE_EMAIL_DOMAIN = { agent: 'easypay-agent.bf', client: 'easypay-client.bf' };
  const phoneToEmail = (phone, ns = 'agent') => {
    const digits = phone.replace(/\D/g, '');
    const normalized = digits.startsWith('226') ? digits : `226${digits}`;
    return `${normalized}@${PHONE_EMAIL_DOMAIN[ns]}`;
  };

  const loginAgent = async (phone, password) => {
    const email = phoneToEmail(phone, 'agent');
    signingIn.current = true;
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      realUidRef.current = result.user.uid;
      setUser(result.user);
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

  // ── Création compte agent par l'admin ────────────────────────────────────
  // operators = { orange: '07XXXXXX', telmob: '60XXXXXX', telecel: '55XXXXXX' }
  const createAgentAccount = async (name, phone, password, operators = {}) => {
    const email = phoneToEmail(phone, 'agent');
    const digits = phone.replace(/\D/g, '');
    const normalized = digits.startsWith('226') ? digits : `226${digits}`;
    const formattedPhone = `+${normalized}`;

    // Nettoie les opérateurs vides
    const cleanOperators = Object.fromEntries(
      Object.entries(operators).filter(([, v]) => v && v.trim())
    );

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
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      await signOut(secondaryAuth);
      return { success: true };
    } catch (error) {
      const msg = error.code === 'auth/email-already-in-use'
        ? 'Un agent avec ce numéro existe déjà.'
        : error.message;
      return { success: false, error: msg };
    }
  };

  const logout = async () => {
    // Laisse le re-login anonyme se faire normalement après déconnexion
    signingIn.current = false;
    realUidRef.current = null;
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
    registerClient,
    loginClient,
    createAgentAccount,
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
