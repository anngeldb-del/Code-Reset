"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { addDays } from "date-fns";
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

const emptyItem: QuotationItem = {
  description: "",
  brand: "",
  quantity: 1,
  unitPrice: 0,
  discount: 0,
};

function defaultValidUntil() {
  return addDays(new Date(), 15).toISOString().slice(0, 10);
}

function makeDefaultForm(clientId = "") {
  return {
    clientId,
    projectName: "",
    description: "",
    attentionTo: "",
    validUntil: defaultValidUntil(),
    currency: "MXN",
    ivaApplies: false,
    paymentTerms: "50% anticipo al confirmar / 50% contra entrega",
    deliveryTime: "",
    warranty: "",
    installation: "",
    transport: "",
    notes: "",
    items: [{ ...emptyItem }] as QuotationItem[],
  };
}

function calcSubtotal(items: QuotationItem[]) {
  return items.reduce((s, it) => {
    const qty = Number(it.quantity) || 0;
    const price = Number(it.unitPrice) || 0;
    const discount = Number(it.discount) || 0;
    return s + qty * price * (1 - discount / 100);
  }, 0);
}

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
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [form, setForm] = useState(() =>
    makeDefaultForm(openedFromQuery ? searchParams.get("clientId") ?? "" : "")
  );

  const subtotal = calcSubtotal(form.items);
  const total = form.ivaApplies ? subtotal * 1.16 : subtotal;

  function updateItem(index: number, patch: Partial<QuotationItem>) {
    setForm((f) => ({
      ...f,
      items: f.items.map((it, i) => (i === index ? { ...it, ...patch } : it)),
    }));
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
        description: form.description,
        attentionTo: form.attentionTo,
        validUntil: form.validUntil,
        items: form.items.filter((it) => it.description.trim()),
        total,
        currency: form.currency,
        ivaApplies: form.ivaApplies,
        paymentTerms: form.paymentTerms,
        deliveryTime: form.deliveryTime,
        warranty: form.warranty,
        installation: form.installation,
        transport: form.transport,
        status: "borrador" as DocStatus,
        notes: form.notes,
      });
      setForm(makeDefaultForm());
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  async function handleDownload(q: Quotation) {
    const client = clientById.get(q.clientId);
    if (!client) return;
    setDownloadingId(q.id);
    try {
      const doc = await buildQuotationPdf(q, client);
      doc.save(`${q.folio}.pdf`);
    } finally {
      setDownloadingId(null);
    }
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
      await handleDownload(q);
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
                  <Button
                    variant="secondary"
                    onClick={() => handleDownload(q)}
                    disabled={downloadingId === q.id}
                  >
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
            <Field label="Cliente / Empresa *">
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

          <div className="grid grid-cols-2 gap-3">
            <Field label="Atención a (contacto/teléfono)">
              <input
                className={inputClass}
                placeholder="Deja vacío para usar el teléfono del cliente"
                value={form.attentionTo}
                onChange={(e) =>
                  setForm({ ...form, attentionTo: e.target.value })
                }
              />
            </Field>
            <Field label="Válida hasta">
              <input
                type="date"
                className={inputClass}
                value={form.validUntil}
                onChange={(e) =>
                  setForm({ ...form, validUntil: e.target.value })
                }
              />
            </Field>
          </div>

          <Field label="Descripción del proyecto">
            <textarea
              className={inputClass}
              rows={2}
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
            />
          </Field>

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
            <div className="space-y-3">
              {form.items.map((it, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-slate-200 p-2"
                >
                  <input
                    className={`${inputClass} mb-2`}
                    placeholder="Descripción del concepto"
                    value={it.description}
                    onChange={(e) =>
                      updateItem(i, { description: e.target.value })
                    }
                  />
                  <div className="grid grid-cols-12 gap-2">
                    <input
                      className={`${inputClass} col-span-4`}
                      placeholder="Marca/Modelo"
                      value={it.brand}
                      onChange={(e) =>
                        updateItem(i, { brand: e.target.value })
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
                      className={`${inputClass} col-span-2`}
                      placeholder="Precio"
                      value={it.unitPrice}
                      onChange={(e) =>
                        updateItem(i, { unitPrice: Number(e.target.value) })
                      }
                    />
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      className={`${inputClass} col-span-2`}
                      placeholder="Dscto. %"
                      value={it.discount}
                      onChange={(e) =>
                        updateItem(i, { discount: Number(e.target.value) })
                      }
                    />
                    <button
                      type="button"
                      className="col-span-2 text-slate-400 hover:text-red-600"
                      onClick={() =>
                        setForm((f) => ({
                          ...f,
                          items: f.items.filter((_, idx) => idx !== i),
                        }))
                      }
                    >
                      ✕ Quitar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
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
            <label className="flex items-center gap-2 self-end pb-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.ivaApplies}
                onChange={(e) =>
                  setForm({ ...form, ivaApplies: e.target.checked })
                }
              />
              Aplicar IVA (16%)
            </label>
            <div className="flex flex-col items-end justify-end text-right">
              <p className="text-xs text-slate-400">
                Subtotal: {formatCurrency(subtotal, form.currency)}
              </p>
              <p className="text-lg font-semibold text-slate-800">
                Total: {formatCurrency(total, form.currency)}
              </p>
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-slate-700">
              Condiciones comerciales
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Forma de pago">
                <input
                  className={inputClass}
                  value={form.paymentTerms}
                  onChange={(e) =>
                    setForm({ ...form, paymentTerms: e.target.value })
                  }
                />
              </Field>
              <Field label="Tiempo de entrega">
                <input
                  className={inputClass}
                  placeholder="Ej. 10 días hábiles"
                  value={form.deliveryTime}
                  onChange={(e) =>
                    setForm({ ...form, deliveryTime: e.target.value })
                  }
                />
              </Field>
              <Field label="Garantía">
                <input
                  className={inputClass}
                  placeholder="Ej. 3 meses de soporte"
                  value={form.warranty}
                  onChange={(e) =>
                    setForm({ ...form, warranty: e.target.value })
                  }
                />
              </Field>
              <Field label="Instalación">
                <input
                  className={inputClass}
                  placeholder="Ej. Incluida en el precio"
                  value={form.installation}
                  onChange={(e) =>
                    setForm({ ...form, installation: e.target.value })
                  }
                />
              </Field>
              <Field label="Transporte">
                <input
                  className={inputClass}
                  value={form.transport}
                  onChange={(e) =>
                    setForm({ ...form, transport: e.target.value })
                  }
                />
              </Field>
              <Field label="Notas">
                <input
                  className={inputClass}
                  value={form.notes}
                  onChange={(e) =>
                    setForm({ ...form, notes: e.target.value })
                  }
                />
              </Field>
            </div>
          </div>

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
