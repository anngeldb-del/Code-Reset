"use client";

import { Button } from "@/components/ui";

export function Pagination({
  pageIndex,
  hasNextPage,
  hasPrevPage,
  onNext,
  onPrev,
}: {
  pageIndex: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  onNext: () => void;
  onPrev: () => void;
}) {
  if (!hasNextPage && !hasPrevPage) return null;

  return (
    <div className="mt-6 flex items-center justify-between">
      <Button
        type="button"
        variant="secondary"
        onClick={onPrev}
        disabled={!hasPrevPage}
      >
        ← Anterior
      </Button>
      <span className="text-xs text-slate-500 dark:text-slate-400">
        Página {pageIndex + 1}
      </span>
      <Button
        type="button"
        variant="secondary"
        onClick={onNext}
        disabled={!hasNextPage}
      >
        Siguiente →
      </Button>
    </div>
  );
}
