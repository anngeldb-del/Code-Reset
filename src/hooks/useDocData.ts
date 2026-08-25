"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

export function useDocData<T>(path: string, id: string | undefined) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db || !id) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- no subscription possible without db/id
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsubscribe = onSnapshot(doc(db, path, id), (snap) => {
      setData(snap.exists() ? ({ id: snap.id, ...snap.data() } as T) : null);
      setLoading(false);
    });
    return unsubscribe;
  }, [path, id]);

  return { data, loading };
}
