"use client";

import { useState } from "react";
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
  quantity: 1,
  unitPrice: 0,
};

export default function PurchaseOrdersPage() {
  const { data: orders, loading } = useCollectionData<PurchaseOrder>(
    "purchaseOrders",
    [orderBy("createdAt", "desc")]
  );

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    supplierName: "",
    supplierContact: "",
    currency: "MXN",
    notes: "",
    items: [{ ...emptyItem }] as PurchaseOrderItem[],
  });

  const total = form.items.reduce(
    (s, it) => s + (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0),
    0
  );

  function updateItem(index: number, patch: Partial<PurchaseOrderItem>) {
    setForm((f) => ({
      ...f,
      items: f.items.map((it, i) => (i === index ? { ...it, ...patch } : it)),
    }));
  }

  function resetForm() {
    setForm({
      supplierName: "",
      supplierContact: "",
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
      const folio = await getNextFolio("OC");
      await createDoc("purchaseOrders", {
        folio,
        supplierName: form.supplierName,
        supplierContact: form.supplierContact,
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

  function handleDownload(po: PurchaseOrder) {
    const doc = buildPurchaseOrderPdf(po);
    doc.save(`${po.folio}.pdf`);
  }

  async function handleSend(po: PurchaseOrder) {
    if (!po.supplierContact) {
      alert("Agrega un teléfono de contacto del proveedor para enviar por WhatsApp.");
      return;
    }
    handleDownload(po);
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
        <p className="text-sm text-slate-400">Cargando...</p>
      ) : orders.length === 0 ? (
        <EmptyState text="Aún no has creado órdenes de compra." />
      ) : (
        <div className="space-y-3">
          {orders.map((po) => (
            <Card key={po.id}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-mono text-xs text-slate-400">
                      {po.folio}
                    </p>
                    <Badge color={STATUS_COLOR[po.status]}>
                      {STATUS_LABEL[po.status]}
                    </Badge>
                  </div>
                  <p className="font-semibold text-slate-900">
                    {po.supplierName}
                  </p>
                  <p className="text-sm text-slate-500">
                    {formatDate(po.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <p className="mr-2 text-lg font-semibold text-slate-800">
                    {formatCurrency(po.total, po.currency)}
                  </p>
                  <Button variant="secondary" onClick={() => handleDownload(po)}>
                    PDF
                  </Button>
                  <Button onClick={() => handleSend(po)}>💬 WhatsApp</Button>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3 text-xs">
                <span className="text-slate-400">Marcar como:</span>
                {(["borrador", "enviada", "aceptada", "rechazada"] as DocStatus[]).map(
                  (s) => (
                    <button
                      key={s}
                      onClick={() => handleStatus(po, s)}
                      className={`rounded-full px-2.5 py-1 font-medium ${
                        po.status === s
                          ? "bg-brand text-white"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {STATUS_LABEL[s]}
                    </button>
                  )
                )}
                <button
                  onClick={() => handleDelete(po)}
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
              {saving ? "Guardando..." : "Guardar orden"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
