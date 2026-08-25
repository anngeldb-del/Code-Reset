"use client";

import { useMemo, useState } from "react";
import { orderBy } from "@/lib/firestore";
import { useCollectionData } from "@/hooks/useCollectionData";
import { PageHeader, Card, Button, Field, inputClass } from "@/components/ui";
import { downloadWorkbook } from "@/lib/excel";
import { formatDate, todayISO } from "@/lib/format";
import type { Client, Payment, Project, Quotation } from "@/types";

const STATUS_LABEL: Record<Project["status"], string> = {
  cotizado: "Cotizado",
  activo: "Activo",
  pausado: "Pausado",
  completado: "Completado",
  cancelado: "Cancelado",
};

const METHOD_LABEL: Record<Payment["method"], string> = {
  efectivo: "Efectivo",
  transferencia: "Transferencia",
  tarjeta: "Tarjeta",
  otro: "Otro",
};

export default function ReportsPage() {
  const { data: payments } = useCollectionData<Payment>("payments", [
    orderBy("date", "desc"),
  ]);
  const { data: projects } = useCollectionData<Project>("projects", [
    orderBy("createdAt", "desc"),
  ]);
  const { data: clients } = useCollectionData<Client>("clients", [
    orderBy("name", "asc"),
  ]);
  const { data: quotations } = useCollectionData<Quotation>("quotations", [
    orderBy("createdAt", "desc"),
  ]);

  const clientById = useMemo(
    () => new Map(clients.map((c) => [c.id, c])),
    [clients]
  );
  const projectById = useMemo(
    () => new Map(projects.map((p) => [p.id, p])),
    [projects]
  );
  const paidByProject = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of payments) {
      map.set(p.projectId, (map.get(p.projectId) ?? 0) + p.amount);
    }
    return map;
  }, [payments]);

  const [from, setFrom] = useState("");
  const [to, setTo] = useState(todayISO());
  const [exporting, setExporting] = useState<string | null>(null);

  async function exportPayments() {
    setExporting("payments");
    try {
      const filtered = payments.filter(
        (p) => (!from || p.date >= from) && (!to || p.date <= to)
      );
      await downloadWorkbook(`code-reset-pagos-${todayISO()}.xlsx`, [
        {
          name: "Pagos",
          columns: [
            { header: "Fecha", key: "date", width: 14 },
            { header: "Cliente", key: "client", width: 28 },
            { header: "Proyecto", key: "project", width: 28 },
            { header: "Recibo", key: "receipt", width: 16 },
            { header: "Método", key: "method", width: 16 },
            { header: "Monto", key: "amount", width: 14 },
            { header: "Nota", key: "note", width: 28 },
          ],
          rows: filtered.map((p) => ({
            date: formatDate(p.date),
            client: clientById.get(p.clientId)?.name ?? "",
            project: projectById.get(p.projectId)?.name ?? "",
            receipt: p.receiptNumber,
            method: METHOD_LABEL[p.method],
            amount: p.amount,
            note: p.note ?? "",
          })),
        },
      ]);
    } finally {
      setExporting(null);
    }
  }

  async function exportProjects() {
    setExporting("projects");
    try {
      await downloadWorkbook(`code-reset-proyectos-${todayISO()}.xlsx`, [
        {
          name: "Proyectos",
          columns: [
            { header: "Cliente", key: "client", width: 28 },
            { header: "Proyecto", key: "name", width: 28 },
            { header: "Estado", key: "status", width: 14 },
            { header: "Presupuesto", key: "budget", width: 14 },
            { header: "Pagado", key: "paid", width: 14 },
            { header: "Saldo", key: "balance", width: 14 },
            { header: "Inicio", key: "startDate", width: 14 },
            { header: "Entrega", key: "endDate", width: 14 },
          ],
          rows: projects.map((p) => {
            const paid = paidByProject.get(p.id) ?? 0;
            return {
              client: clientById.get(p.clientId)?.name ?? "",
              name: p.name,
              status: STATUS_LABEL[p.status],
              budget: p.budgetTotal,
              paid,
              balance: Math.max(p.budgetTotal - paid, 0),
              startDate: p.startDate ? formatDate(p.startDate) : "",
              endDate: p.endDate ? formatDate(p.endDate) : "",
            };
          }),
        },
      ]);
    } finally {
      setExporting(null);
    }
  }

  async function exportClients() {
    setExporting("clients");
    try {
      await downloadWorkbook(`code-reset-clientes-${todayISO()}.xlsx`, [
        {
          name: "Clientes",
          columns: [
            { header: "Empresa", key: "name", width: 28 },
            { header: "Contacto", key: "contactName", width: 22 },
            { header: "Teléfono", key: "phone", width: 18 },
            { header: "Correo", key: "email", width: 26 },
            { header: "Dirección", key: "address", width: 30 },
          ],
          rows: clients.map((c) => ({
            name: c.name,
            contactName: c.contactName ?? "",
            phone: c.phone ?? "",
            email: c.email ?? "",
            address: c.address ?? "",
          })),
        },
      ]);
    } finally {
      setExporting(null);
    }
  }

  async function exportQuotations() {
    setExporting("quotations");
    try {
      await downloadWorkbook(`code-reset-cotizaciones-${todayISO()}.xlsx`, [
        {
          name: "Cotizaciones",
          columns: [
            { header: "Folio", key: "folio", width: 16 },
            { header: "Cliente", key: "client", width: 28 },
            { header: "Proyecto", key: "project", width: 28 },
            { header: "Estado", key: "status", width: 14 },
            { header: "Total", key: "total", width: 14 },
            { header: "Fecha", key: "date", width: 14 },
          ],
          rows: quotations.map((q) => ({
            folio: q.folio,
            client: clientById.get(q.clientId)?.name ?? "",
            project: q.projectName,
            status: q.status,
            total: q.total,
            date: formatDate(q.createdAt),
          })),
        },
      ]);
    } finally {
      setExporting(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="Reportes"
        description="Exporta la información de Code Reset a Excel"
      />

      <Card className="mb-6">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">
          Rango de fechas para reporte de pagos
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Desde">
            <input
              type="date"
              className={inputClass}
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </Field>
          <Field label="Hasta">
            <input
              type="date"
              className={inputClass}
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </Field>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <p className="mb-3 text-sm font-semibold text-slate-700">Pagos</p>
          <Button
            className="w-full"
            onClick={exportPayments}
            disabled={exporting === "payments"}
          >
            {exporting === "payments" ? "Generando..." : "Exportar .xlsx"}
          </Button>
        </Card>
        <Card>
          <p className="mb-3 text-sm font-semibold text-slate-700">
            Proyectos
          </p>
          <Button
            className="w-full"
            onClick={exportProjects}
            disabled={exporting === "projects"}
          >
            {exporting === "projects" ? "Generando..." : "Exportar .xlsx"}
          </Button>
        </Card>
        <Card>
          <p className="mb-3 text-sm font-semibold text-slate-700">
            Clientes
          </p>
          <Button
            className="w-full"
            onClick={exportClients}
            disabled={exporting === "clients"}
          >
            {exporting === "clients" ? "Generando..." : "Exportar .xlsx"}
          </Button>
        </Card>
        <Card>
          <p className="mb-3 text-sm font-semibold text-slate-700">
            Cotizaciones
          </p>
          <Button
            className="w-full"
            onClick={exportQuotations}
            disabled={exporting === "quotations"}
          >
            {exporting === "quotations" ? "Generando..." : "Exportar .xlsx"}
          </Button>
        </Card>
      </div>
    </div>
  );
}
