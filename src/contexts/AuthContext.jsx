import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  signInWithPhoneNumber,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously,
  RecaptchaVerifier,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, secondaryAuth } from '../firebase/config';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [confirmationResult, setConfirmationResult] = useState(null);
  // Empêche le re-login anonyme automatique pendant une connexion intentionnelle
  const signingIn = React.useRef(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        try {
          const profile = await fetchUserProfile(firebaseUser.uid);
          setUserProfile(profile);
        } catch (err) {
          console.error('Error fetching user profile:', err);
        }
        setLoading(false);
      } else {
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

  const clearRecaptcha = () => {
    try {
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
      }
    } catch (_) {}
    window.recaptchaVerifier = null;
    // Remove all recaptcha iframes/badges injected by Firebase
    document.querySelectorAll('iframe[src*="recaptcha"]').forEach(el => el.remove());
    document.querySelectorAll('.grecaptcha-badge').forEach(el => el.remove());
  };

  const getRecaptchaVerifier = () => {
    if (window.recaptchaVerifier) return window.recaptchaVerifier;
    window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
      size: 'invisible',
      callback: () => {},
      'expired-callback': clearRecaptcha,
    });
    return window.recaptchaVerifier;
  };

  const sendOTP = async (phoneNumber) => {
    clearRecaptcha();
    try {
      const verifier = getRecaptchaVerifier();
      const result = await signInWithPhoneNumber(auth, phoneNumber, verifier);
      setConfirmationResult(result);
      return { success: true };
    } catch (error) {
      console.error('Error sending OTP:', error);
      clearRecaptcha();
      return { success: false, error: error.message };
    }
  };

  const verifyOTP = async (otp) => {
    if (!confirmationResult) {
      return { success: false, error: 'Veuillez demander un code OTP d\'abord.' };
    }
    try {
      const result = await confirmationResult.confirm(otp);
      const firebaseUser = result.user;

      // Check if user profile exists, create if not
      const docRef = doc(db, 'users', firebaseUser.uid);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        const newProfile = {
          uid: firebaseUser.uid,
          phone: firebaseUser.phoneNumber,
          name: '',
          role: 'client',
          balance: 0,
          active: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        await setDoc(docRef, newProfile);
        setUserProfile(newProfile);
      } else {
        setUserProfile({ uid: firebaseUser.uid, ...docSnap.data() });
      }

      return { success: true, user: firebaseUser };
    } catch (error) {
      console.error('Error verifying OTP:', error);
      return { success: false, error: 'Code OTP invalide. Veuillez réessayer.' };
    }
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

  // ── Connexion agent (numéro + mot de passe) ─────────────────────────────
  const phoneToEmail = (phone) => {
    const digits = phone.replace(/\D/g, '');
    const normalized = digits.startsWith('226') ? digits : `226${digits}`;
    return `${normalized}@easypay-agent.bf`;
  };

  const loginAgent = async (phone, password) => {
    const email = phoneToEmail(phone);
    signingIn.current = true;
    try {
      await signInWithEmailAndPassword(auth, email, password);
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
    const email = phoneToEmail(phone);
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
    sendOTP,
    verifyOTP,
    loginAgent,
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
