"use client";

import { useEffect, useState } from "react";
import type { QueryConstraint } from "firebase/firestore";
import { subscribeCollection } from "@/lib/firestore";

export function useCollectionData<T>(
  path: string,
  constraints: QueryConstraint[] = [],
  deps: unknown[] = []
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- resets loading when path/deps change (subscription restart)
    setLoading(true);
    const unsubscribe = subscribeCollection<T>(
      path,
      constraints,
      (items) => {
        setData(items);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, ...deps]);

  return { data, loading, error };
}
