import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
  type DocumentData,
  type QueryConstraint,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

function requireDb() {
  if (!db) {
    throw new Error(
      "Firestore no está configurado. Agrega tus variables de entorno NEXT_PUBLIC_FIREBASE_*."
    );
  }
  return db;
}

export function subscribeCollection<T>(
  path: string,
  constraints: QueryConstraint[],
  onData: (items: T[]) => void,
  onError?: (err: Error) => void
) {
  if (!db) {
    onData([]);
    return () => {};
  }
  const q = query(collection(db, path), ...constraints);
  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs.map(
        (d) => ({ id: d.id, ...d.data() }) as unknown as T
      );
      onData(items);
    },
    (err) => onError?.(err)
  );
}

export async function createDoc(path: string, data: DocumentData) {
  const database = requireDb();
  const now = Date.now();
  const ref = await addDoc(collection(database, path), {
    ...data,
    createdAt: data.createdAt ?? now,
    updatedAt: now,
    _serverCreatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateDocById(
  path: string,
  id: string,
  data: DocumentData
) {
  const database = requireDb();
  await updateDoc(doc(database, path, id), {
    ...data,
    updatedAt: Date.now(),
  });
}

export async function deleteDocById(path: string, id: string) {
  const database = requireDb();
  await deleteDoc(doc(database, path, id));
}

export { orderBy, where };

export async function getNextFolio(prefix: "COT" | "OC"): Promise<string> {
  const database = requireDb();
  const counterRef = doc(database, "counters", prefix);
  const value = await runTransaction(database, async (tx) => {
    const snap = await tx.get(counterRef);
    const current = snap.exists() ? (snap.data().value as number) : 0;
    const next = current + 1;
    tx.set(counterRef, { value: next }, { merge: true });
    return next;
  });
  const year = new Date().getFullYear();
  return `${prefix}-${year}-${String(value).padStart(4, "0")}`;
}

export async function getNextReceiptNumber(): Promise<string> {
  const database = requireDb();
  const counterRef = doc(database, "counters", "REC");
  const value = await runTransaction(database, async (tx) => {
    const snap = await tx.get(counterRef);
    const current = snap.exists() ? (snap.data().value as number) : 0;
    const next = current + 1;
    tx.set(counterRef, { value: next }, { merge: true });
    return next;
  });
  const year = new Date().getFullYear();
  return `REC-${year}-${String(value).padStart(4, "0")}`;
}
