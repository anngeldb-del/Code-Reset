"use client";

import { useMemo, useState } from "react";
import { orderBy } from "@/lib/firestore";
import { useCollectionData } from "@/hooks/useCollectionData";
import { PageHeader, Card, EmptyState, Badge } from "@/components/ui";
import { GanttChart } from "@/components/GanttChart";
import type { Client, Project, ProjectStatus } from "@/types";

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

const LEGEND: { status: ProjectStatus; dotClass: string }[] = [
  { status: "cotizado", dotClass: "bg-slate-400 dark:bg-slate-600" },
  { status: "activo", dotClass: "bg-brand" },
  { status: "pausado", dotClass: "bg-amber-500" },
  { status: "completado", dotClass: "bg-emerald-500" },
  { status: "cancelado", dotClass: "bg-red-400" },
];

export default function GanttPage() {
  const { data: projects, loading } = useCollectionData<Project>("projects", [
    orderBy("startDate", "asc"),
  ]);
  const { data: clients } = useCollectionData<Client>("clients", []);
  const clientNameById = useMemo(
    () => new Map(clients.map((c) => [c.id, c.name])),
    [clients]
  );

  const [statusFilter, setStatusFilter] = useState<ProjectStatus | "todos">(
    "todos"
  );

  const filtered =
    statusFilter === "todos"
      ? projects
      : projects.filter((p) => p.status === statusFilter);

  const withDates = filtered.filter((p) => p.startDate);
  const withoutDates = filtered.filter((p) => !p.startDate);

  return (
    <div>
      <PageHeader
        title="Diagrama de Gantt"
        description="Línea de tiempo de tus proyectos por fecha de inicio y entrega"
      />

      <div className="mb-4 flex flex-wrap items-center gap-4">
        <div className="flex flex-wrap gap-2">
          {(["todos", ...Object.keys(STATUS_LABEL)] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s as ProjectStatus | "todos")}
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                statusFilter === s
                  ? "bg-brand text-white"
                  : "border border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              }`}
            >
              {s === "todos" ? "Todos" : STATUS_LABEL[s as ProjectStatus]}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
          {LEGEND.map((l) => (
            <span key={l.status} className="flex items-center gap-1.5">
              <span className={`h-2.5 w-2.5 rounded-full ${l.dotClass}`} />
              {STATUS_LABEL[l.status]}
            </span>
          ))}
        </div>
      </div>

      <Card>
        {loading ? (
          <p className="text-sm text-slate-400 dark:text-slate-500">
            Cargando...
          </p>
        ) : withDates.length === 0 ? (
          <EmptyState text="Ningún proyecto tiene fecha de inicio todavía. Agrega fechas en cada proyecto para verlas aquí." />
        ) : (
          <GanttChart projects={withDates} clientNameById={clientNameById} />
        )}
      </Card>

      {withoutDates.length > 0 && (
        <Card className="mt-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-300">
            Sin fecha de inicio ({withoutDates.length})
          </h2>
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {withoutDates.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between py-2 text-sm"
              >
                <span className="text-slate-700 dark:text-slate-300">
                  {p.name}
                </span>
                <Badge color={STATUS_COLOR[p.status]}>
                  {STATUS_LABEL[p.status]}
                </Badge>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
