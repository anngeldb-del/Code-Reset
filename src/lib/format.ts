export function formatCurrency(amount: number, currency = "MXN") {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount || 0);
}

export function formatDate(value: string | number | Date) {
  const date = typeof value === "string" && !value.includes("T")
    ? new Date(`${value}T00:00:00`)
    : new Date(value);
  return new Intl.DateTimeFormat("es-MX", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(date);
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
