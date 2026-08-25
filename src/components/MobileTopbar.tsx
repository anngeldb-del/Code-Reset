"use client";

import Image from "next/image";
import { BUSINESS } from "@/lib/business";

export function MobileTopbar({ onOpenMenu }: { onOpenMenu: () => void }) {
  return (
    <div className="no-print sticky top-0 z-30 flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900 lg:hidden">
      <button
        type="button"
        onClick={onOpenMenu}
        aria-label="Abrir menú"
        className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5"
        >
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>
      <div className="h-7 w-7 shrink-0 overflow-hidden rounded-md bg-black">
        <Image
          src={BUSINESS.logoUrl}
          alt={BUSINESS.name}
          width={28}
          height={28}
          className="h-full w-full object-cover"
        />
      </div>
      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
        {BUSINESS.name}
      </p>
    </div>
  );
}
