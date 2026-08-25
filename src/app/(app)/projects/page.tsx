"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { orderBy, where, createDoc } from "@/lib/firestore";
import { useCollectionData } from "@/hooks/useCollectionData";
import { usePaginatedCollection } from "@/hooks/usePaginatedCollection";
import {
  PageHeader,
  Card,
  Button,
  Badge,
  Modal,
  Field,
  inputClass,
  EmptyState,
} from "@/components/ui";
import { Pagination } from "@/components/Pagination";
import { formatCurrency, todayISO } from "@/lib/format";
import type { Client, Payment, Project, ProjectStatus } from "@/types";

const PAGE_SIZE = 9;

const STATUS_LABEL: Record<ProjectStatus, string> = {
  cotizado: "Cotizado",
  activo: "Activo",
  pausado: "Pausado",
  completado: "Completado",
  cancelado: "Cancelado",
};

const STATUS_COLOR: Record<
  ProjectStatus,
  "slate" | "green" | "amber" | "red" | "brand"
> = {
  cotizado: "slate",
  activo: "brand",
  pausado: "amber",
  completado: "green",
  cancelado: "red",
};

export default function ProjectsPage() {
  const searchParams = useSearchParams();
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | "todos">(
    "todos"
  );
  const projectConstraints =
    statusFilter === "todos"
      ? [orderBy("createdAt", "desc")]
      : [where("status", "==", statusFilter)];
  const {
    items: projects,
    loading,
    pageIndex,
    hasNextPage,
    hasPrevPage,
    nextPage,
    prevPage,
  } = usePaginatedCollection<Project>(
    "projects",
    projectConstraints,
    PAGE_SIZE,
    [statusFilter]
  );
  const { data: clients } = useCollectionData<Client>("clients", [
    orderBy("name", "asc"),
  ]);
  const { data: payments } = useCollectionData<Payment>("payments", []);

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

  const openedFromQuery = searchParams.get("new") === "1";
  const [open, setOpen] = useState(openedFromQuery);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    clientId: openedFromQuery ? searchParams.get("clientId") ?? "" : "",
    name: "",
    description: "",
    status: "cotizado" as ProjectStatus,
    startDate: todayISO(),
    endDate: "",
    budgetTotal: "",
    currency: "MXN",
  });

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await createDoc("projects", {
        ...form,
        budgetTotal: Number(form.budgetTotal) || 0,
      });
      setForm({
        clientId: "",
        name: "",
        description: "",
        status: "cotizado",
        startDate: todayISO(),
        endDate: "",
        budgetTotal: "",
        currency: "MXN",
      });
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Proyectos"
        description="Proyectos personalizados para tus clientes"
        actions={
          <>
            <Link href="/projects/gantt">
              <Button variant="secondary">📅 Ver Gantt</Button>
            </Link>
            <Button onClick={() => setOpen(true)}>+ Nuevo proyecto</Button>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {(["todos", ...Object.keys(STATUS_LABEL)] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s as ProjectStatus | "todos")}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              statusFilter === s
                ? "bg-brand text-white"
                : "bg-white text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-800"
            }`}
          >
            {s === "todos" ? "Todos" : STATUS_LABEL[s as ProjectStatus]}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-slate-400 dark:text-slate-500">Cargando...</p>
      ) : projects.length === 0 ? (
        <EmptyState text="No hay proyectos con este filtro." />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => {
            const paid = paidByProject.get(p.id) ?? 0;
            const balance = Math.max(p.budgetTotal - paid, 0);
            return (
              <Link key={p.id} href={`/projects/${p.id}`}>
                <Card className="h-full transition hover:border-brand hover:shadow-md">
                  <div className="mb-2 flex items-start justify-between">
                    <p className="font-semibold text-slate-900 dark:text-slate-100">{p.name}</p>
                    <Badge color={STATUS_COLOR[p.status]}>
                      {STATUS_LABEL[p.status]}
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {clientById.get(p.clientId)?.name ?? "Cliente"}
                  </p>
                  <div className="mt-3 flex items-center justify-between text-sm">
                    <span className="text-slate-500 dark:text-slate-400">
                      Presupuesto: {formatCurrency(p.budgetTotal, p.currency)}
                    </span>
                  </div>
                  <div className="mt-1 text-sm font-medium text-amber-600 dark:text-amber-400">
                    Saldo: {formatCurrency(balance, p.currency)}
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      <Pagination
        pageIndex={pageIndex}
        hasNextPage={hasNextPage}
        hasPrevPage={hasPrevPage}
        onNext={nextPage}
        onPrev={prevPage}
      />

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Nuevo proyecto"
        wide
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Cliente *">
              <select
                required
                className={inputClass}
                value={form.clientId}
                onChange={(e) =>
                  setForm({ ...form, clientId: e.target.value })
                }
              >
                <option value="">Selecciona un cliente</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Estado">
              <select
                className={inputClass}
                value={form.status}
                onChange={(e) =>
                  setForm({
                    ...form,
                    status: e.target.value as ProjectStatus,
                  })
                }
              >
                {Object.entries(STATUS_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Nombre del proyecto *">
            <input
              required
              className={inputClass}
              placeholder="Sitio web / Sistema de pedidos / etc."
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </Field>

          <Field label="Descripción">
            <textarea
              className={inputClass}
              rows={2}
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Fecha inicio">
              <input
                type="date"
                className={inputClass}
                value={form.startDate}
                onChange={(e) =>
                  setForm({ ...form, startDate: e.target.value })
                }
              />
            </Field>
            <Field label="Fecha entrega estimada">
              <input
                type="date"
                className={inputClass}
                value={form.endDate}
                onChange={(e) =>
                  setForm({ ...form, endDate: e.target.value })
                }
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Presupuesto total *">
              <input
                required
                type="number"
                min="0"
                step="0.01"
                className={inputClass}
                value={form.budgetTotal}
                onChange={(e) =>
                  setForm({ ...form, budgetTotal: e.target.value })
                }
              />
            </Field>
            <Field label="Moneda">
              <select
                className={inputClass}
                value={form.currency}
                onChange={(e) =>
                  setForm({ ...form, currency: e.target.value })
                }
              >
                <option value="MXN">MXN</option>
                <option value="USD">USD</option>
              </select>
            </Field>
          </div>

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Guardando..." : "Guardar proyecto"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
