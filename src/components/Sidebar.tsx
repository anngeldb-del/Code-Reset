"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { BUSINESS } from "@/lib/business";
import clsx from "clsx";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: "📊" },
  { href: "/clients", label: "Clientes", icon: "🏢" },
  { href: "/projects", label: "Proyectos", icon: "📁" },
  { href: "/quotations", label: "Cotizaciones", icon: "🧾" },
  { href: "/purchase-orders", label: "Órdenes de compra", icon: "🛒" },
  { href: "/reports", label: "Reportes", icon: "📈" },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuth();

  return (
    <aside className="no-print flex h-screen w-64 shrink-0 flex-col border-r border-slate-200 bg-white">
      <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-black">
          <Image
            src={BUSINESS.logoUrl}
            alt={BUSINESS.name}
            width={36}
            height={36}
            className="h-full w-full object-cover"
          />
        </div>
        <div>
          <p className="text-sm font-semibold leading-tight text-slate-900">
            {BUSINESS.name}
          </p>
          <p className="text-xs text-slate-500">Gestión interna</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {NAV_ITEMS.map((item) => {
          const active =
            pathname === item.href || pathname?.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition",
                active
                  ? "bg-brand/10 text-brand"
                  : "text-slate-600 hover:bg-slate-100"
              )}
            >
              <span aria-hidden>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-200 p-4">
        <p className="truncate text-xs text-slate-500">{user?.email}</p>
        <button
          onClick={async () => {
            await signOut();
            router.push("/login");
          }}
          className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100"
        >
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
