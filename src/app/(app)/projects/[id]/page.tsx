"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  where,
  createDoc,
  updateDocById,
  deleteDocById,
  getNextReceiptNumber,
} from "@/lib/firestore";
import { useDocData } from "@/hooks/useDocData";
import { useCollectionData } from "@/hooks/useCollectionData";
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
import { formatCurrency, formatDate, todayISO } from "@/lib/format";
import type { Client, Payment, PaymentMethod, Project, ProjectStatus } from "@/types";

const STATUS_LABEL: Record<ProjectStatus, string> = {
  cotizado: "Cotizado",
  activo: "Activo",
  pausado: "Pausado",
  completado: "Completado",
  cancelado: "Cancelado",
};

const METHOD_LABEL: Record<PaymentMethod, string> = {
  efectivo: "Efectivo",
  transferencia: "Transferencia",
  tarjeta: "Tarjeta",
  otro: "Otro",
};

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { data: project, loading } = useDocData<Project>(
    "projects",
    params.id
  );
  const { data: paymentsRaw } = useCollectionData<Payment>(
    "payments",
    [where("projectId", "==", params.id)],
    [params.id]
  );
  const payments = [...paymentsRaw].sort((a, b) =>
    b.date.localeCompare(a.date)
  );
  const { data: clients } = useCollectionData<Client>("clients", []);
  const client = clients.find((c) => c.id === project?.clientId);

  const totalPaid = useMemo(
    () => payments.reduce((s, p) => s + p.amount, 0),
    [payments]
  );
  const balance = project ? Math.max(project.budgetTotal - totalPaid, 0) : 0;

  const [payOpen, setPayOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payForm, setPayForm] = useState({
    date: todayISO(),
    amount: "",
    method: "transferencia" as PaymentMethod,
    note: "",
  });
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Partial<Project>>({});
  const [receipt, setReceipt] = useState<Payment | null>(null);

  async function handleAddPayment(e: React.FormEvent) {
    e.preventDefault();
    if (!project) return;
    setSaving(true);
    setError(null);
    try {
      const receiptNumber = await getNextReceiptNumber();
      await createDoc("payments", {
        projectId: project.id,
        clientId: project.clientId,
        date: payForm.date,
        amount: Number(payForm.amount) || 0,
        method: payForm.method,
        note: payForm.note,
        receiptNumber,
      });
      setPayForm({
        date: todayISO(),
        amount: "",
        method: "transferencia",
        note: "",
      });
      setPayOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar pago");
    } finally {
      setSaving(false);
    }
  }

  function startEdit() {
    if (!project) return;
    setForm(project);
    setEditing(true);
  }

  async function handleSaveProject(e: React.FormEvent) {
    e.preventDefault();
    if (!project) return;
    setSaving(true);
    try {
      await updateDocById("projects", project.id, {
        name: form.name,
        description: form.description ?? "",
        status: form.status,
        startDate: form.startDate ?? "",
        endDate: form.endDate ?? "",
        budgetTotal: Number(form.budgetTotal) || 0,
        currency: form.currency ?? "MXN",
      });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteProject() {
    if (!project) return;
    if (
      !confirm(
        `¿Eliminar el proyecto "${project.name}"? Los pagos registrados no se eliminarán automáticamente.`
      )
    )
      return;
    await deleteDocById("projects", project.id);
    router.push("/projects");
  }

  async function handleDeletePayment(payment: Payment) {
    if (!confirm(`¿Eliminar el pago ${payment.receiptNumber}?`)) return;
    await deleteDocById("payments", payment.id);
  }

  if (loading) return <p className="text-sm text-slate-400">Cargando...</p>;
  if (!project) return <EmptyState text="Proyecto no encontrado." />;

  return (
    <div>
      <PageHeader
        title={project.name}
        description={client ? `Cliente: ${client.name}` : undefined}
        actions={
          <>
            <Button onClick={() => setPayOpen(true)}>+ Registrar pago</Button>
            <Button variant="secondary" onClick={startEdit}>
              Editar
            </Button>
            <Button variant="danger" onClick={handleDeleteProject}>
              Eliminar
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <p className="text-xs uppercase text-slate-400">Estado</p>
          <Badge>{STATUS_LABEL[project.status]}</Badge>
        </Card>
        <Card>
          <p className="text-xs uppercase text-slate-400">Presupuesto</p>
          <p className="mt-1 text-lg font-semibold text-slate-800">
            {formatCurrency(project.budgetTotal, project.currency)}
          </p>
        </Card>
        <Card>
          <p className="text-xs uppercase text-slate-400">Pagado</p>
          <p className="mt-1 text-lg font-semibold text-emerald-600">
            {formatCurrency(totalPaid, project.currency)}
          </p>
        </Card>
        <Card>
          <p className="text-xs uppercase text-slate-400">Saldo pendiente</p>
          <p className="mt-1 text-lg font-semibold text-amber-600">
            {formatCurrency(balance, project.currency)}
          </p>
        </Card>
      </div>

      {project.description && (
        <Card className="mt-4">
          <p className="text-sm text-slate-600">{project.description}</p>
        </Card>
      )}

      <Card className="mt-6">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">
          Historial de pagos
        </h2>
        {payments.length === 0 ? (
          <EmptyState text="Aún no se han registrado pagos para este proyecto." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400">
                  <th className="py-2 pr-4">Recibo</th>
                  <th className="py-2 pr-4">Fecha</th>
                  <th className="py-2 pr-4">Método</th>
                  <th className="py-2 pr-4">Nota</th>
                  <th className="py-2 pr-4">Monto</th>
                  <th className="py-2 pr-4" />
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b border-slate-100 last:border-0"
                  >
                    <td className="py-2 pr-4 font-mono text-xs text-slate-500">
                      {p.receiptNumber}
                    </td>
                    <td className="py-2 pr-4">{formatDate(p.date)}</td>
                    <td className="py-2 pr-4">{METHOD_LABEL[p.method]}</td>
                    <td className="py-2 pr-4 text-slate-500">
                      {p.note || "—"}
                    </td>
                    <td className="py-2 pr-4 font-medium text-emerald-600">
                      {formatCurrency(p.amount, project.currency)}
                    </td>
                    <td className="py-2 pr-4 text-right">
                      <button
                        className="mr-3 text-xs font-medium text-brand hover:underline"
                        onClick={() => setReceipt(p)}
                      >
                        Recibo
                      </button>
                      <button
                        className="text-xs font-medium text-red-600 hover:underline"
                        onClick={() => handleDeletePayment(p)}
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal
        open={payOpen}
        onClose={() => setPayOpen(false)}
        title="Registrar pago"
      >
        <form onSubmit={handleAddPayment} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Fecha *">
              <input
                type="date"
                required
                className={inputClass}
                value={payForm.date}
                onChange={(e) =>
                  setPayForm({ ...payForm, date: e.target.value })
                }
              />
            </Field>
            <Field label="Monto *">
              <input
                type="number"
                min="0"
                step="0.01"
                required
                className={inputClass}
                value={payForm.amount}
                onChange={(e) =>
                  setPayForm({ ...payForm, amount: e.target.value })
                }
              />
            </Field>
          </div>
          <Field label="Método de pago">
            <select
              className={inputClass}
              value={payForm.method}
              onChange={(e) =>
                setPayForm({
                  ...payForm,
                  method: e.target.value as PaymentMethod,
                })
              }
            >
              {Object.entries(METHOD_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Nota">
            <input
              className={inputClass}
              value={payForm.note}
              onChange={(e) =>
                setPayForm({ ...payForm, note: e.target.value })
              }
            />
          </Field>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setPayOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Guardando..." : "Registrar pago"}
            </Button>
          </div>
        </form>
      </Modal>

      {editing && (
        <Modal
          open={editing}
          onClose={() => setEditing(false)}
          title="Editar proyecto"
          wide
        >
          <form onSubmit={handleSaveProject} className="space-y-4">
            <Field label="Nombre">
              <input
                required
                className={inputClass}
                value={form.name ?? ""}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </Field>
            <Field label="Descripción">
              <textarea
                className={inputClass}
                rows={2}
                value={form.description ?? ""}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
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
              <Field label="Presupuesto total">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className={inputClass}
                  value={form.budgetTotal ?? 0}
                  onChange={(e) =>
                    setForm({ ...form, budgetTotal: Number(e.target.value) })
                  }
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Fecha inicio">
                <input
                  type="date"
                  className={inputClass}
                  value={form.startDate ?? ""}
                  onChange={(e) =>
                    setForm({ ...form, startDate: e.target.value })
                  }
                />
              </Field>
              <Field label="Fecha entrega">
                <input
                  type="date"
                  className={inputClass}
                  value={form.endDate ?? ""}
                  onChange={(e) =>
                    setForm({ ...form, endDate: e.target.value })
                  }
                />
              </Field>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setEditing(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Guardando..." : "Guardar cambios"}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {receipt && client && (
        <Modal open={!!receipt} onClose={() => setReceipt(null)} title="Recibo">
          <div className="space-y-4">
            <div id="receipt-content" className="rounded-xl border border-slate-200 p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-lg font-bold text-slate-900">Code Reset</p>
                  <p className="text-xs text-slate-500">
                    Recibo de pago #{receipt.receiptNumber}
                  </p>
                </div>
                <p className="text-sm text-slate-500">
                  {formatDate(receipt.date)}
                </p>
              </div>
              <div className="mb-4 text-sm">
                <p className="text-slate-500">Cliente</p>
                <p className="font-medium text-slate-800">{client.name}</p>
                <p className="text-slate-500 mt-2">Proyecto</p>
                <p className="font-medium text-slate-800">{project.name}</p>
              </div>
              <div className="flex items-center justify-between border-t border-slate-200 pt-3">
                <div>
                  <p className="text-xs text-slate-500">
                    Método: {METHOD_LABEL[receipt.method]}
                  </p>
                  {receipt.note && (
                    <p className="text-xs text-slate-500">
                      Nota: {receipt.note}
                    </p>
                  )}
                </div>
                <p className="text-xl font-bold text-emerald-600">
                  {formatCurrency(receipt.amount, project.currency)}
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setReceipt(null)}>
                Cerrar
              </Button>
              <Button onClick={() => window.print()}>Imprimir</Button>
            </div>
          </div>
        </Modal>
      )}

      <p className="mt-6 text-xs text-slate-400">
        <Link href="/projects" className="hover:text-brand">
          ← Volver a proyectos
        </Link>
      </p>
    </div>
  );
}
