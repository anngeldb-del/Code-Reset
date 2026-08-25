"use client";

import { useState } from "react";
import Link from "next/link";
import { orderBy, createDoc } from "@/lib/firestore";
import { usePaginatedCollection } from "@/hooks/usePaginatedCollection";
import {
  PageHeader,
  Card,
  Button,
  Modal,
  Field,
  inputClass,
  EmptyState,
} from "@/components/ui";
import { Pagination } from "@/components/Pagination";
import type { Client } from "@/types";

const PAGE_SIZE = 9;

export default function ClientsPage() {
  const {
    items: clients,
    loading,
    pageIndex,
    hasNextPage,
    hasPrevPage,
    nextPage,
    prevPage,
  } = usePaginatedCollection<Client>(
    "clients",
    [orderBy("name", "asc")],
    PAGE_SIZE
  );
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    contactName: "",
    phone: "",
    email: "",
    address: "",
    notes: "",
  });

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await createDoc("clients", form);
      setForm({
        name: "",
        contactName: "",
        phone: "",
        email: "",
        address: "",
        notes: "",
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
        title="Clientes"
        description="Empresas locales que usan tus servicios"
        actions={
          <Button onClick={() => setOpen(true)}>+ Nuevo cliente</Button>
        }
      />

      {loading ? (
        <p className="text-sm text-slate-400 dark:text-slate-500">Cargando...</p>
      ) : clients.length === 0 ? (
        <EmptyState text="Todavía no tienes clientes registrados." />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {clients.map((c) => (
            <Link key={c.id} href={`/clients/${c.id}`}>
              <Card className="h-full transition hover:border-brand hover:shadow-md">
                <p className="font-semibold text-slate-900 dark:text-slate-100">{c.name}</p>
                {c.contactName && (
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Contacto: {c.contactName}
                  </p>
                )}
                {c.phone && (
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">📞 {c.phone}</p>
                )}
                {c.email && (
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">✉️ {c.email}</p>
                )}
              </Card>
            </Link>
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

      <Modal open={open} onClose={() => setOpen(false)} title="Nuevo cliente">
        <form onSubmit={handleCreate} className="space-y-4">
          <Field label="Nombre de la empresa *">
            <input
              required
              className={inputClass}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </Field>
          <Field label="Nombre de contacto">
            <input
              className={inputClass}
              value={form.contactName}
              onChange={(e) =>
                setForm({ ...form, contactName: e.target.value })
              }
            />
          </Field>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Teléfono (WhatsApp)">
              <input
                className={inputClass}
                placeholder="+52 55 0000 0000"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </Field>
            <Field label="Correo">
              <input
                type="email"
                className={inputClass}
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </Field>
          </div>
          <Field label="Dirección">
            <input
              className={inputClass}
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </Field>
          <Field label="Notas">
            <textarea
              className={inputClass}
              rows={2}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </Field>

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
              {saving ? "Guardando..." : "Guardar cliente"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
