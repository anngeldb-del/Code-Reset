"use client";

import { useEffect, useState } from "react";
import {
  collection,
  limit,
  onSnapshot,
  query,
  startAfter,
  type QueryConstraint,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export function usePaginatedCollection<T>(
  path: string,
  baseConstraints: QueryConstraint[],
  pageSize: number,
  deps: unknown[] = []
) {
  const [pageIndex, setPageIndex] = useState(0);
  const [cursors, setCursors] = useState<(QueryDocumentSnapshot | null)[]>([
    null,
  ]);
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- filters/deps changed, restart pagination from page 0
    setPageIndex(0);
    setCursors([null]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, pageSize, ...deps]);

  const cursor = cursors[pageIndex];

  useEffect(() => {
    if (!db) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- no Firestore configured
      setLoading(false);
      return;
    }
    setLoading(true);
    const constraints = [
      ...baseConstraints,
      ...(cursor ? [startAfter(cursor)] : []),
      limit(pageSize + 1),
    ];
    const unsubscribe = onSnapshot(
      query(collection(db, path), ...constraints),
      (snap) => {
        const docs = snap.docs;
        const hasMore = docs.length > pageSize;
        const pageDocs = docs.slice(0, pageSize);
        setItems(pageDocs.map((d) => ({ id: d.id, ...d.data() }) as T));
        setHasNextPage(hasMore);
        setLoading(false);
        if (pageDocs.length > 0) {
          const lastDoc = pageDocs[pageDocs.length - 1];
          setCursors((prev) => {
            if (prev[pageIndex + 1] === lastDoc) return prev;
            const next = [...prev];
            next[pageIndex + 1] = lastDoc;
            return next;
          });
        }
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, pageIndex, cursor, pageSize, ...deps]);

  return {
    items,
    loading,
    error,
    pageIndex,
    hasNextPage,
    hasPrevPage: pageIndex > 0,
    nextPage: () => hasNextPage && setPageIndex((p) => p + 1),
    prevPage: () => pageIndex > 0 && setPageIndex((p) => p - 1),
  };
}
