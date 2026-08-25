"use client";

import { useState } from "react";
import { addDays } from "date-fns";
import {
  orderBy,
  createDoc,
  updateDocById,
  deleteDocById,
  getNextFolio,
} from "@/lib/firestore";
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
import { formatCurrency, formatDate } from "@/lib/format";
import { buildPurchaseOrderPdf } from "@/lib/pdf";
import { buildWhatsAppLink, purchaseOrderMessage } from "@/lib/whatsapp";
import type { DocStatus, PurchaseOrder, PurchaseOrderItem } from "@/types";

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

const emptyItem: PurchaseOrderItem = {
  description: "",
  brand: "",
  quantity: 1,
  unitPrice: 0,
  discount: 0,
};

function defaultValidUntil() {
  return addDays(new Date(), 15).toISOString().slice(0, 10);
}

function makeDefaultForm() {
  return {
    supplierName: "",
    supplierContact: "",
    description: "",
    validUntil: defaultValidUntil(),
    currency: "MXN",
    ivaApplies: false,
    paymentTerms: "50% anticipo al confirmar / 50% contra entrega",
    deliveryTime: "",
    warranty: "",
    installation: "",
    transport: "",
    notes: "",
    items: [{ ...emptyItem }] as PurchaseOrderItem[],
  };
}

function calcSubtotal(items: PurchaseOrderItem[]) {
  return items.reduce((s, it) => {
    const qty = Number(it.quantity) || 0;
    const price = Number(it.unitPrice) || 0;
    const discount = Number(it.discount) || 0;
    return s + qty * price * (1 - discount / 100);
  }, 0);
}

const PAGE_SIZE = 8;

export default function PurchaseOrdersPage() {
  const {
    items: orders,
    loading,
    pageIndex,
    hasNextPage,
    hasPrevPage,
    nextPage,
    prevPage,
  } = usePaginatedCollection<PurchaseOrder>(
    "purchaseOrders",
    [orderBy("createdAt", "desc")],
    PAGE_SIZE
  );

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [form, setForm] = useState(makeDefaultForm);

  const subtotal = calcSubtotal(form.items);
  const total = form.ivaApplies ? subtotal * 1.16 : subtotal;

  function updateItem(index: number, patch: Partial<PurchaseOrderItem>) {
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
      const folio = await getNextFolio("OC");
      await createDoc("purchaseOrders", {
        folio,
        supplierName: form.supplierName,
        supplierContact: form.supplierContact,
        description: form.description,
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

  async function handleDownload(po: PurchaseOrder) {
    setDownloadingId(po.id);
    try {
      const doc = await buildPurchaseOrderPdf(po);
      doc.save(`${po.folio}.pdf`);
    } finally {
      setDownloadingId(null);
    }
  }

  async function handleSend(po: PurchaseOrder) {
    if (!po.supplierContact) {
      alert("Agrega un teléfono de contacto del proveedor para enviar por WhatsApp.");
      return;
    }
    await handleDownload(po);
    const message = purchaseOrderMessage({
      supplierName: po.supplierName,
      folio: po.folio,
      totalFormatted: formatCurrency(po.total, po.currency),
    });
    const link = buildWhatsAppLink(po.supplierContact, message);
    window.open(link, "_blank");
    if (po.status === "borrador") {
      await updateDocById("purchaseOrders", po.id, { status: "enviada" });
    }
  }

  async function handleStatus(po: PurchaseOrder, status: DocStatus) {
    await updateDocById("purchaseOrders", po.id, { status });
  }

  async function handleDelete(po: PurchaseOrder) {
    if (!confirm(`¿Eliminar la orden de compra ${po.folio}?`)) return;
    await deleteDocById("purchaseOrders", po.id);
  }

  return (
    <div>
      <PageHeader
        title="Órdenes de compra"
        description="Solicita insumos o servicios a tus proveedores"
        actions={<Button onClick={() => setOpen(true)}>+ Nueva orden</Button>}
      />

      {loading ? (
        <p className="text-sm text-slate-400 dark:text-slate-500">Cargando...</p>
      ) : orders.length === 0 ? (
        <EmptyState text="Aún no has creado órdenes de compra." />
      ) : (
        <div className="space-y-3">
          {orders.map((po) => (
            <Card key={po.id}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-mono text-xs text-slate-400 dark:text-slate-500">
                      {po.folio}
                    </p>
                    <Badge color={STATUS_COLOR[po.status]}>
                      {STATUS_LABEL[po.status]}
                    </Badge>
                  </div>
                  <p className="font-semibold text-slate-900 dark:text-slate-100">
                    {po.supplierName}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {formatDate(po.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <p className="mr-2 text-lg font-semibold text-slate-800 dark:text-slate-200">
                    {formatCurrency(po.total, po.currency)}
                  </p>
                  <Button
                    variant="secondary"
                    onClick={() => handleDownload(po)}
                    disabled={downloadingId === po.id}
                  >
                    PDF
                  </Button>
                  <Button onClick={() => handleSend(po)}>💬 WhatsApp</Button>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3 text-xs dark:border-slate-800/60">
                <span className="text-slate-400 dark:text-slate-500">Marcar como:</span>
                {(["borrador", "enviada", "aceptada", "rechazada"] as DocStatus[]).map(
                  (s) => (
                    <button
                      key={s}
                      onClick={() => handleStatus(po, s)}
                      className={`rounded-full px-2.5 py-1 font-medium ${
                        po.status === s
                          ? "bg-brand text-white"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                      }`}
                    >
                      {STATUS_LABEL[s]}
                    </button>
                  )
                )}
                <button
                  onClick={() => handleDelete(po)}
                  className="ml-auto font-medium text-red-600 hover:underline dark:text-red-400"
                >
                  Eliminar
                </button>
              </div>
            </Card>
          ))}
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
        title="Nueva orden de compra"
        wide
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Proveedor *">
              <input
                required
                className={inputClass}
                value={form.supplierName}
                onChange={(e) =>
                  setForm({ ...form, supplierName: e.target.value })
                }
              />
            </Field>
            <Field label="Teléfono de contacto (WhatsApp)">
              <input
                className={inputClass}
                placeholder="+52 55 0000 0000"
                value={form.supplierContact}
                onChange={(e) =>
                  setForm({ ...form, supplierContact: e.target.value })
                }
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Descripción">
              <input
                className={inputClass}
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
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

          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Conceptos</p>
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
                  className="rounded-lg border border-slate-200 p-2 dark:border-slate-800"
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
                      className="col-span-2 text-slate-400 hover:text-red-600 dark:text-slate-500 dark:hover:text-red-400"
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
            <label className="flex items-center gap-2 self-end pb-2 text-sm text-slate-700 dark:text-slate-300">
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
              <p className="text-xs text-slate-400 dark:text-slate-500">
                Subtotal: {formatCurrency(subtotal, form.currency)}
              </p>
              <p className="text-lg font-semibold text-slate-800 dark:text-slate-200">
                Total: {formatCurrency(total, form.currency)}
              </p>
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">
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
                  value={form.warranty}
                  onChange={(e) =>
                    setForm({ ...form, warranty: e.target.value })
                  }
                />
              </Field>
              <Field label="Instalación">
                <input
                  className={inputClass}
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
              {saving ? "Guardando..." : "Guardar orden"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
