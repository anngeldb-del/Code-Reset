"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { orderBy } from "@/lib/firestore";
import { useCollectionData } from "@/hooks/useCollectionData";
import { PageHeader, Card, StatCard, EmptyState, Badge } from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/format";
import { useTheme } from "@/context/ThemeContext";
import type { Client, Payment, Project } from "@/types";
import Link from "next/link";

const STATUS_LABEL: Record<Project["status"], string> = {
  cotizado: "Cotizado",
  activo: "Activo",
  pausado: "Pausado",
  completado: "Completado",
  cancelado: "Cancelado",
};

const STATUS_COLOR: Record<Project["status"], "slate" | "green" | "amber" | "red" | "brand"> = {
  cotizado: "slate",
  activo: "brand",
  pausado: "amber",
  completado: "green",
  cancelado: "red",
};

export default function DashboardPage() {
  const { theme } = useTheme();
  const chartColors =
    theme === "dark"
      ? { grid: "#1e293b", axis: "#64748b", bar: "#818cf8" }
      : { grid: "#e2e8f0", axis: "#94a3b8", bar: "#4f46e5" };

  const { data: projects, loading: loadingProjects } =
    useCollectionData<Project>("projects", [orderBy("createdAt", "desc")]);
  const { data: payments, loading: loadingPayments } =
    useCollectionData<Payment>("payments", [orderBy("date", "desc")]);
  const { data: clients } = useCollectionData<Client>("clients", [
    orderBy("name", "asc"),
  ]);

  const clientById = useMemo(
    () => new Map(clients.map((c) => [c.id, c])),
    [clients]
  );

  const paidByProject = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of payments) {
      map.set(p.projectId, (map.get(p.projectId) ?? 0) + p.amount);
    }
    return map;
  }, [payments]);

  const totalIncome = useMemo(
    () => payments.reduce((sum, p) => sum + p.amount, 0),
    [payments]
  );

  const activeProjects = projects.filter(
    (p) => p.status === "activo" || p.status === "pausado"
  );

  const pendingBalance = useMemo(() => {
    return projects
      .filter((p) => p.status !== "cancelado")
      .reduce((sum, p) => {
        const paid = paidByProject.get(p.id) ?? 0;
        const balance = Math.max(p.budgetTotal - paid, 0);
        return sum + balance;
      }, 0);
  }, [projects, paidByProject]);

  const monthlyIncome = useMemo(() => {
    const buckets = new Map<string, number>();
    for (const p of payments) {
      const key = p.date.slice(0, 7);
      buckets.set(key, (buckets.get(key) ?? 0) + p.amount);
    }
    return Array.from(buckets.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([month, total]) => ({
        month: new Intl.DateTimeFormat("es-MX", {
          month: "short",
          year: "2-digit",
        }).format(new Date(`${month}-01T00:00:00`)),
        total,
      }));
  }, [payments]);

  const recentPayments = payments.slice(0, 6);

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Resumen general de Code Reset"
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Ingresos totales"
          value={formatCurrency(totalIncome)}
          accent="green"
          hint={`${payments.length} pagos registrados`}
        />
        <StatCard
          label="Saldo pendiente"
          value={formatCurrency(pendingBalance)}
          accent="amber"
          hint="Suma de proyectos no cancelados"
        />
        <StatCard
          label="Proyectos activos"
          value={String(activeProjects.length)}
          accent="brand"
          hint={`${projects.length} proyectos en total`}
        />
        <StatCard
          label="Clientes"
          value={String(clients.length)}
          accent="slate"
          hint="Empresas registradas"
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <h2 className="mb-4 text-sm font-semibold text-slate-700 dark:text-slate-300">
            Ingresos por mes
          </h2>
          {monthlyIncome.length === 0 ? (
            <EmptyState text="Aún no hay pagos registrados." />
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyIncome}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                  <XAxis
                    dataKey="month"
                    stroke={chartColors.axis}
                    fontSize={12}
                    tickLine={false}
                  />
                  <YAxis
                    stroke={chartColors.axis}
                    fontSize={12}
                    tickLine={false}
                    tickFormatter={(v) => formatCurrency(v).replace(/\.00$/, "")}
                    width={90}
                  />
                  <Tooltip
                    formatter={(value) => formatCurrency(Number(value))}
                    contentStyle={
                      theme === "dark"
                        ? {
                            background: "#0f172a",
                            border: "1px solid #1e293b",
                            color: "#e2e8f0",
                          }
                        : undefined
                    }
                  />
                  <Bar dataKey="total" fill={chartColors.bar} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card>
          <h2 className="mb-4 text-sm font-semibold text-slate-700 dark:text-slate-300">
            Pagos recientes
          </h2>
          {recentPayments.length === 0 ? (
            <EmptyState text="Sin pagos todavía." />
          ) : (
            <ul className="space-y-3">
              {recentPayments.map((p) => (
                <li key={p.id} className="flex items-center justify-between text-sm">
                  <div>
                    <p className="font-medium text-slate-800 dark:text-slate-200">
                      {clientById.get(p.clientId)?.name ?? "Cliente"}
                    </p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">
                      {formatDate(p.date)}
                    </p>
                  </div>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(p.amount)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card className="mt-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Proyectos recientes
          </h2>
          <Link
            href="/projects"
            className="text-xs font-medium text-brand hover:underline"
          >
            Ver todos
          </Link>
        </div>
        {loadingProjects || loadingPayments ? (
          <p className="text-sm text-slate-400 dark:text-slate-500">Cargando...</p>
        ) : projects.length === 0 ? (
          <EmptyState text="Todavía no has registrado proyectos." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400 dark:border-slate-800 dark:text-slate-500">
                  <th className="py-2 pr-4">Proyecto</th>
                  <th className="py-2 pr-4">Cliente</th>
                  <th className="py-2 pr-4">Estado</th>
                  <th className="py-2 pr-4">Presupuesto</th>
                  <th className="py-2 pr-4">Saldo</th>
                </tr>
              </thead>
              <tbody>
                {projects.slice(0, 6).map((p) => {
                  const paid = paidByProject.get(p.id) ?? 0;
                  const balance = Math.max(p.budgetTotal - paid, 0);
                  return (
                    <tr
                      key={p.id}
                      className="border-b border-slate-100 last:border-0 dark:border-slate-800/60"
                    >
                      <td className="py-2 pr-4">
                        <Link
                          href={`/projects/${p.id}`}
                          className="font-medium text-slate-800 hover:text-brand dark:text-slate-200"
                        >
                          {p.name}
                        </Link>
                      </td>
                      <td className="py-2 pr-4 text-slate-600 dark:text-slate-400">
                        {clientById.get(p.clientId)?.name ?? "—"}
                      </td>
                      <td className="py-2 pr-4">
                        <Badge color={STATUS_COLOR[p.status]}>
                          {STATUS_LABEL[p.status]}
                        </Badge>
                      </td>
                      <td className="py-2 pr-4 text-slate-600 dark:text-slate-400">
                        {formatCurrency(p.budgetTotal, p.currency)}
                      </td>
                      <td className="py-2 pr-4 font-medium text-amber-600 dark:text-amber-400">
                        {formatCurrency(balance, p.currency)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
