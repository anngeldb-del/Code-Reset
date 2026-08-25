"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  orderBy,
  createDoc,
  updateDocById,
  deleteDocById,
  getNextFolio,
} from "@/lib/firestore";
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
import { formatCurrency, formatDate } from "@/lib/format";
import { buildQuotationPdf } from "@/lib/pdf";
import { buildWhatsAppLink, quotationMessage } from "@/lib/whatsapp";
import type { Client, DocStatus, Quotation, QuotationItem } from "@/types";

const STATUS_LABEL: Record<DocStatus, string> = {
  borrador: "Borrador",
  enviada: "Enviada",
  aceptada: "Aceptada",
  rechazada: "Rechazada",
};

const STATUS_COLOR: Record<DocStatus, "slate" | "green" | "amber" | "red" | "brand"> = {
  borrador: "slate",
  enviada: "brand",
  aceptada: "green",
  rechazada: "red",
};

const emptyItem: QuotationItem = { description: "", quantity: 1, unitPrice: 0 };

export default function QuotationsPage() {
  const searchParams = useSearchParams();
  const { data: quotations, loading } = useCollectionData<Quotation>(
    "quotations",
    [orderBy("createdAt", "desc")]
  );
  const { data: clients } = useCollectionData<Client>("clients", [
    orderBy("name", "asc"),
  ]);
  const clientById = useMemo(
    () => new Map(clients.map((c) => [c.id, c])),
    [clients]
  );

  const openedFromQuery = searchParams.get("new") === "1";
  const [open, setOpen] = useState(openedFromQuery);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    clientId: openedFromQuery ? searchParams.get("clientId") ?? "" : "",
    projectName: "",
    currency: "MXN",
    notes: "",
    items: [{ ...emptyItem }] as QuotationItem[],
  });

  const total = form.items.reduce(
    (s, it) => s + (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0),
    0
  );

  function updateItem(index: number, patch: Partial<QuotationItem>) {
    setForm((f) => ({
      ...f,
      items: f.items.map((it, i) => (i === index ? { ...it, ...patch } : it)),
    }));
  }

  function resetForm() {
    setForm({
      clientId: "",
      projectName: "",
      currency: "MXN",
      notes: "",
      items: [{ ...emptyItem }],
    });
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const folio = await getNextFolio("COT");
      await createDoc("quotations", {
        folio,
        clientId: form.clientId,
        projectName: form.projectName,
        items: form.items.filter((it) => it.description.trim()),
        total,
        currency: form.currency,
        status: "borrador" as DocStatus,
        notes: form.notes,
      });
      resetForm();
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  function handleDownload(q: Quotation) {
    const client = clientById.get(q.clientId);
    if (!client) return;
    const doc = buildQuotationPdf(q, client);
    doc.save(`${q.folio}.pdf`);
  }

  async function handleSend(q: Quotation) {
    const client = clientById.get(q.clientId);
    if (!client) return;
    if (!client.phone) {
      alert("Este cliente no tiene teléfono registrado.");
      return;
    }
    setSendingId(q.id);
    try {
      handleDownload(q);
      const message = quotationMessage({
        clientName: client.name,
        projectName: q.projectName,
        folio: q.folio,
        totalFormatted: formatCurrency(q.total, q.currency),
      });
      const link = buildWhatsAppLink(client.phone, message);
      window.open(link, "_blank");
      if (q.status === "borrador") {
        await updateDocById("quotations", q.id, { status: "enviada" });
      }
    } finally {
      setSendingId(null);
    }
  }

  async function handleStatus(q: Quotation, status: DocStatus) {
    await updateDocById("quotations", q.id, { status });
  }

  async function handleDelete(q: Quotation) {
    if (!confirm(`¿Eliminar la cotización ${q.folio}?`)) return;
    await deleteDocById("quotations", q.id);
  }

  return (
    <div>
      <PageHeader
        title="Cotizaciones"
        description="Genera y envía cotizaciones por WhatsApp"
        actions={
          <Button onClick={() => setOpen(true)}>+ Nueva cotización</Button>
        }
      />

      {loading ? (
        <p className="text-sm text-slate-400">Cargando...</p>
      ) : quotations.length === 0 ? (
        <EmptyState text="Aún no has creado cotizaciones." />
      ) : (
        <div className="space-y-3">
          {quotations.map((q) => (
            <Card key={q.id}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-mono text-xs text-slate-400">
                      {q.folio}
                    </p>
                    <Badge color={STATUS_COLOR[q.status]}>
                      {STATUS_LABEL[q.status]}
                    </Badge>
                  </div>
                  <p className="font-semibold text-slate-900">
                    {q.projectName}
                  </p>
                  <p className="text-sm text-slate-500">
                    {clientById.get(q.clientId)?.name ?? "Cliente"} ·{" "}
                    {formatDate(q.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <p className="mr-2 text-lg font-semibold text-slate-800">
                    {formatCurrency(q.total, q.currency)}
                  </p>
                  <Button variant="secondary" onClick={() => handleDownload(q)}>
                    PDF
                  </Button>
                  <Button
                    onClick={() => handleSend(q)}
                    disabled={sendingId === q.id}
                  >
                    💬 WhatsApp
                  </Button>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3 text-xs">
                <span className="text-slate-400">Marcar como:</span>
                {(["borrador", "enviada", "aceptada", "rechazada"] as DocStatus[]).map(
                  (s) => (
                    <button
                      key={s}
                      onClick={() => handleStatus(q, s)}
                      className={`rounded-full px-2.5 py-1 font-medium ${
                        q.status === s
                          ? "bg-brand text-white"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {STATUS_LABEL[s]}
                    </button>
                  )
                )}
                <button
                  onClick={() => handleDelete(q)}
                  className="ml-auto font-medium text-red-600 hover:underline"
                >
                  Eliminar
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Nueva cotización"
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
            <Field label="Proyecto *">
              <input
                required
                className={inputClass}
                value={form.projectName}
                onChange={(e) =>
                  setForm({ ...form, projectName: e.target.value })
                }
              />
            </Field>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-medium text-slate-700">Conceptos</p>
              <button
                type="button"
                className="text-xs font-medium text-brand hover:underline"
                onClick={() =>
                  setForm((f) => ({
                    ...f,
                    items: [...f.items, { ...emptyItem }],
                  }))
                }
              >
                + Agregar concepto
              </button>
            </div>
            <div className="space-y-2">
              {form.items.map((it, i) => (
                <div key={i} className="grid grid-cols-12 gap-2">
                  <input
                    className={`${inputClass} col-span-6`}
                    placeholder="Descripción"
                    value={it.description}
                    onChange={(e) =>
                      updateItem(i, { description: e.target.value })
                    }
                  />
                  <input
                    type="number"
                    min="0"
                    step="1"
                    className={`${inputClass} col-span-2`}
                    placeholder="Cant."
                    value={it.quantity}
                    onChange={(e) =>
                      updateItem(i, { quantity: Number(e.target.value) })
                    }
                  />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className={`${inputClass} col-span-3`}
                    placeholder="Precio unitario"
                    value={it.unitPrice}
                    onChange={(e) =>
                      updateItem(i, { unitPrice: Number(e.target.value) })
                    }
                  />
                  <button
                    type="button"
                    className="col-span-1 text-slate-400 hover:text-red-600"
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        items: f.items.filter((_, idx) => idx !== i),
                      }))
                    }
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
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
            <div className="flex items-end justify-end">
              <p className="text-lg font-semibold text-slate-800">
                Total: {formatCurrency(total, form.currency)}
              </p>
            </div>
          </div>

          <Field label="Notas">
            <textarea
              className={inputClass}
              rows={2}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </Field>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Guardando..." : "Guardar cotización"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
