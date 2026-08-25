"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { where, updateDocById, deleteDocById } from "@/lib/firestore";
import { useDocData } from "@/hooks/useDocData";
import { useCollectionData } from "@/hooks/useCollectionData";
import {
  PageHeader,
  Card,
  Button,
  Badge,
  Field,
  inputClass,
  EmptyState,
} from "@/components/ui";
import { formatCurrency } from "@/lib/format";
import type { Client, Payment, Project } from "@/types";

const STATUS_LABEL: Record<Project["status"], string> = {
  cotizado: "Cotizado",
  activo: "Activo",
  pausado: "Pausado",
  completado: "Completado",
  cancelado: "Cancelado",
};

function ClientDetailContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id") ?? undefined;
  const router = useRouter();
  const { data: client, loading } = useDocData<Client>("clients", id);
  const { data: projectsRaw } = useCollectionData<Project>(
    "projects",
    [where("clientId", "==", id)],
    [id]
  );
  const projects = [...projectsRaw].sort((a, b) => b.createdAt - a.createdAt);
  const { data: payments } = useCollectionData<Payment>(
    "payments",
    [where("clientId", "==", id)],
    [id]
  );

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Partial<Client>>({});

  const totalPaid = payments.reduce((s, p) => s + p.amount, 0);

  function startEdit() {
    if (!client) return;
    setForm(client);
    setEditing(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!client) return;
    setSaving(true);
    try {
      await updateDocById("clients", client.id, {
        name: form.name,
        contactName: form.contactName ?? "",
        phone: form.phone ?? "",
        email: form.email ?? "",
        address: form.address ?? "",
        notes: form.notes ?? "",
      });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!client) return;
    if (
      !confirm(
        `¿Eliminar al cliente "${client.name}"? Esta acción no se puede deshacer.`
      )
    )
      return;
    await deleteDocById("clients", client.id);
    router.push("/clients");
  }

  if (loading) return <p className="text-sm text-slate-400 dark:text-slate-500">Cargando...</p>;
  if (!client) return <EmptyState text="Cliente no encontrado." />;

  return (
    <div>
      <PageHeader
        title={client.name}
        description={client.contactName}
        actions={
          <>
            <Button variant="secondary" onClick={startEdit}>
              Editar
            </Button>
            <Button variant="danger" onClick={handleDelete}>
              Eliminar
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card>
          <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-300">
            Datos de contacto
          </h2>
          <dl className="space-y-2 text-sm">
            <div>
              <dt className="text-slate-400 dark:text-slate-500">Teléfono</dt>
              <dd className="text-slate-700 dark:text-slate-300">{client.phone || "—"}</dd>
            </div>
            <div>
              <dt className="text-slate-400 dark:text-slate-500">Correo</dt>
              <dd className="text-slate-700 dark:text-slate-300">{client.email || "—"}</dd>
            </div>
            <div>
              <dt className="text-slate-400 dark:text-slate-500">Dirección</dt>
              <dd className="text-slate-700 dark:text-slate-300">{client.address || "—"}</dd>
            </div>
            {client.notes && (
              <div>
                <dt className="text-slate-400 dark:text-slate-500">Notas</dt>
                <dd className="text-slate-700 dark:text-slate-300">{client.notes}</dd>
              </div>
            )}
          </dl>
          {client.phone && (
            <a
              href={`https://wa.me/${client.phone.replace(/[^0-9]/g, "")}`}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              💬 Escribir por WhatsApp
            </a>
          )}
        </Card>

        <Card>
          <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-300">
            Resumen
          </h2>
          <p className="text-xs text-slate-400 dark:text-slate-500">Total pagado</p>
          <p className="text-xl font-semibold text-emerald-600 dark:text-emerald-400">
            {formatCurrency(totalPaid)}
          </p>
          <p className="mt-3 text-xs text-slate-400 dark:text-slate-500">Proyectos</p>
          <p className="text-xl font-semibold text-slate-800 dark:text-slate-200">
            {projects.length}
          </p>
        </Card>

        <Card className="lg:col-span-1">
          <Link href={`/projects?new=1&clientId=${client.id}`}>
            <Button className="w-full">+ Nuevo proyecto</Button>
          </Link>
          <Link href={`/quotations?new=1&clientId=${client.id}`}>
            <Button variant="secondary" className="mt-2 w-full">
              + Nueva cotización
            </Button>
          </Link>
        </Card>
      </div>

      <Card className="mt-6">
        <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-300">
          Proyectos
        </h2>
        {projects.length === 0 ? (
          <EmptyState text="Este cliente aún no tiene proyectos." />
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {projects.map((p) => (
              <li key={p.id} className="flex items-center justify-between py-3">
                <div>
                  <Link
                    href={`/projects/detail?id=${p.id}`}
                    className="font-medium text-slate-800 hover:text-brand dark:text-slate-200"
                  >
                    {p.name}
                  </Link>
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    {formatCurrency(p.budgetTotal, p.currency)}
                  </p>
                </div>
                <Badge>{STATUS_LABEL[p.status]}</Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4 py-8">
          <div className="max-h-full w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900">
            <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">Editar cliente</h2>
            <form onSubmit={handleSave} className="space-y-4">
              <Field label="Nombre">
                <input
                  required
                  className={inputClass}
                  value={form.name ?? ""}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </Field>
              <Field label="Contacto">
                <input
                  className={inputClass}
                  value={form.contactName ?? ""}
                  onChange={(e) =>
                    setForm({ ...form, contactName: e.target.value })
                  }
                />
              </Field>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Teléfono">
                  <input
                    className={inputClass}
                    value={form.phone ?? ""}
                    onChange={(e) =>
                      setForm({ ...form, phone: e.target.value })
                    }
                  />
                </Field>
                <Field label="Correo">
                  <input
                    className={inputClass}
                    value={form.email ?? ""}
                    onChange={(e) =>
                      setForm({ ...form, email: e.target.value })
                    }
                  />
                </Field>
              </div>
              <Field label="Dirección">
                <input
                  className={inputClass}
                  value={form.address ?? ""}
                  onChange={(e) =>
                    setForm({ ...form, address: e.target.value })
                  }
                />
              </Field>
              <Field label="Notas">
                <textarea
                  className={inputClass}
                  rows={2}
                  value={form.notes ?? ""}
                  onChange={(e) =>
                    setForm({ ...form, notes: e.target.value })
                  }
                />
              </Field>
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
          </div>
        </div>
      )}
    </div>
  );
}

export default function ClientDetailPage() {
  return (
    <Suspense fallback={<p className="text-sm text-slate-400 dark:text-slate-500">Cargando...</p>}>
      <ClientDetailContent />
    </Suspense>
  );
}
