import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAk9G6TW3LyQodNfpFaCAWPW7mNlbpN-Q0",
  authDomain: "easypay-bf.firebaseapp.com",
  projectId: "easypay-bf",
  storageBucket: "easypay-bf.firebasestorage.app",
  messagingSenderId: "748075855522",
  appId: "1:748075855522:web:dde2ac2225236740c271fb",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const q = query(collection(db, 'users'), where('role', '==', 'agent'));
const snap = await getDocs(q);

console.log(`\n${snap.docs.length} agent(s) trouvé(s) :\n`);
snap.docs.forEach(d => {
  const data = d.data();
  console.log(`  ID: ${d.id}`);
  console.log(`  Nom: ${data.name}`);
  console.log(`  Téléphone: ${data.phone}`);
  console.log(`  Actif: ${data.active}`);
  console.log('');
});

process.exit(0);
