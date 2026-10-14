import { db, collection, getDocs, setDoc, doc, writeBatch } from './firebase';
import { STORAGE_KEYS, storageHelper } from './App';
import type { Product, Student, Transaction } from './App';

export async function migrateLocalStorageToFirestore(): Promise<boolean> {
  const migrated = localStorage.getItem('firestore_migrated');
  if (migrated === 'true') return false;

  const products = storageHelper.get<Product[]>(STORAGE_KEYS.INVENTORY, []);
  const students = storageHelper.get<Student[]>(STORAGE_KEYS.STUDENTS, []);
  const transactions = storageHelper.get<Transaction[]>(STORAGE_KEYS.TRANSACTIONS, []);

  const existing = await getDocs(collection(db, 'products'));
  if (!existing.empty) {
    localStorage.setItem('firestore_migrated', 'true');
    return false;
  }

  const batch = writeBatch(db);
  for (const p of products) {
    batch.set(doc(db, 'products', p.id), p);
  }
  for (const s of students) {
    batch.set(doc(db, 'students', s.id), s);
  }
  for (const t of transactions) {
    batch.set(doc(db, 'transactions', t.id), t);
  }
  await batch.commit();

  localStorage.setItem('firestore_migrated', 'true');
  return true;
}
