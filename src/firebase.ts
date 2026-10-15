import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  writeBatch,
  setLogLevel,
} from 'firebase/firestore';
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyCC_QYPlzBc8C2jWThB7EI3ELUkwmSUhHY",
  authDomain: "kantin-mabit.firebaseapp.com",
  projectId: "kantin-mabit",
  storageBucket: "kantin-mabit.firebasestorage.app",
  messagingSenderId: "367635375292",
  appId: "1:367635375292:web:d8e9170b3953f28b1d5cb9"
};

const app = initializeApp(firebaseConfig);

const db = getFirestore(app);
const auth = getAuth(app);

setLogLevel('error');

export {
  db,
  auth,
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  writeBatch,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
};
export type { User };
