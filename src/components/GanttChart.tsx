"use client";

import Link from "next/link";
import {
  addDays,
  differenceInCalendarDays,
  eachMonthOfInterval,
  endOfMonth,
  format,
  isValid,
  max as dateMax,
  min as dateMin,
  parseISO,
  startOfMonth,
} from "date-fns";
import { es } from "date-fns/locale";
import type { Project } from "@/types";

const STATUS_LABEL: Record<Project["status"], string> = {
  cotizado: "Cotizado",
  activo: "Activo",
  pausado: "Pausado",
  completado: "Completado",
  cancelado: "Cancelado",
};

const STATUS_BAR_CLASS: Record<Project["status"], string> = {
  cotizado: "bg-slate-400 dark:bg-slate-600",
  activo: "bg-brand",
  pausado: "bg-amber-500",
  completado: "bg-emerald-500",
  cancelado: "bg-red-400",
};

const DEFAULT_DURATION_DAYS = 21;

function safeParseISO(value?: string): Date | null {
  if (!value) return null;
  const parsed = parseISO(value);
  return isValid(parsed) ? parsed : null;
}

interface GanttRow {
  project: Project;
  clientName: string;
  start: Date;
  end: Date;
  estimated: boolean;
}

export function GanttChart({
  projects,
  clientNameById,
}: {
  projects: Project[];
  clientNameById: Map<string, string>;
}) {
  const today = new Date();

  const rows: GanttRow[] = projects
    .map((project) => {
      const parsedStart = safeParseISO(project.startDate);
      if (!parsedStart) return null;
      const parsedEnd = safeParseISO(project.endDate);
      const end = parsedEnd ?? addDays(parsedStart, DEFAULT_DURATION_DAYS);
      return {
        project,
        clientName: clientNameById.get(project.clientId) ?? "Cliente",
        start: parsedStart,
        end: end < parsedStart ? parsedStart : end,
        estimated: !parsedEnd,
      };
    })
    .filter((row): row is GanttRow => row !== null)
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  if (rows.length === 0) {
    return null;
  }

  const rangeStart = startOfMonth(
    dateMin([...rows.map((r) => r.start), addDays(today, -30)])
  );
  const rangeEnd = endOfMonth(
    dateMax([...rows.map((r) => r.end), addDays(today, 60)])
  );
  const totalDays = Math.max(differenceInCalendarDays(rangeEnd, rangeStart), 1);
  const months = eachMonthOfInterval({ start: rangeStart, end: rangeEnd });

  function pct(date: Date) {
    return (differenceInCalendarDays(date, rangeStart) / totalDays) * 100;
  }

  const todayPct = pct(today);
  const minColWidth = 90; // px per month, for horizontal scroll on small screens
  const timelineMinWidth = months.length * minColWidth;

  return (
    <div className="overflow-x-auto">
      <div style={{ minWidth: timelineMinWidth + 240 }}>
        <div className="flex">
          <div className="w-60 shrink-0" />
          <div className="relative flex flex-1">
            {months.map((m) => (
              <div
                key={m.toISOString()}
                className="flex-1 border-l border-slate-200 py-2 text-center text-xs font-medium text-slate-500 dark:border-slate-800 dark:text-slate-400"
              >
                {format(m, "MMM yy", { locale: es })}
              </div>
            ))}
          </div>
        </div>

        <div className="relative">
          {todayPct >= 0 && todayPct <= 100 && (
            <div
              className="pointer-events-none absolute top-0 bottom-0 z-10 w-px bg-red-400 dark:bg-red-500"
              style={{ left: `calc(15rem + ${todayPct}%)` }}
            >
              <span className="absolute -top-5 -translate-x-1/2 whitespace-nowrap text-[10px] font-medium text-red-500 dark:text-red-400">
                Hoy
              </span>
            </div>
          )}

          {rows.map((row) => (
            <div
              key={row.project.id}
              className="flex items-center border-t border-slate-100 py-2 dark:border-slate-800/60"
            >
              <div className="w-60 shrink-0 pr-3">
                <Link
                  href={`/projects/${row.project.id}`}
                  className="block truncate text-sm font-medium text-slate-800 hover:text-brand dark:text-slate-200"
                  title={row.project.name}
                >
                  {row.project.name}
                </Link>
                <p className="truncate text-xs text-slate-400 dark:text-slate-500">
                  {row.clientName}
                </p>
              </div>
              <div className="relative h-6 flex-1">
                <Link
                  href={`/projects/${row.project.id}`}
                  className={`absolute top-0.5 h-5 rounded-full ${STATUS_BAR_CLASS[row.project.status]} ${
                    row.estimated ? "opacity-60" : ""
                  } transition hover:opacity-80`}
                  style={{
                    left: `${Math.max(pct(row.start), 0)}%`,
                    width: `${Math.max(pct(row.end) - pct(row.start), 1.5)}%`,
                  }}
                  title={`${row.project.name} · ${STATUS_LABEL[row.project.status]} · ${format(
                    row.start,
                    "d MMM yyyy",
                    { locale: es }
                  )} – ${format(row.end, "d MMM yyyy", { locale: es })}${
                    row.estimated ? " (fecha de fin estimada)" : ""
                  }`}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
