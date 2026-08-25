import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";
import { formatCurrency, formatDate } from "@/lib/format";
import type {
  Client,
  Quotation,
  PurchaseOrder,
  PurchaseOrderItem,
  QuotationItem,
} from "@/types";

const BRAND = "Code Reset";
const BRAND_SUBTITLE = "Aplicaciones web personalizadas apoyadas en IA";

function header(doc: jsPDF, title: string, folio: string, date: number) {
  doc.setFontSize(18);
  doc.setTextColor(79, 70, 229);
  doc.text(BRAND, 14, 20);
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(BRAND_SUBTITLE, 14, 26);

  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text(title, 196, 20, { align: "right" });
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(`Folio: ${folio}`, 196, 26, { align: "right" });
  doc.text(`Fecha: ${formatDate(date)}`, 196, 31, { align: "right" });

  doc.setDrawColor(226, 232, 240);
  doc.line(14, 36, 196, 36);
}

function itemsTable(
  doc: jsPDF,
  items: (QuotationItem | PurchaseOrderItem)[],
  currency: string,
  startY: number
) {
  autoTable(doc, {
    startY,
    head: [["Descripción", "Cantidad", "Precio unitario", "Subtotal"]],
    body: items.map((it) => [
      it.description,
      String(it.quantity),
      formatCurrency(it.unitPrice, currency),
      formatCurrency(it.quantity * it.unitPrice, currency),
    ]),
    headStyles: { fillColor: [79, 70, 229] },
    styles: { fontSize: 10 },
  });
}

function getFinalY(doc: jsPDF): number {
  const withAutoTable = doc as jsPDF & {
    lastAutoTable?: { finalY: number };
  };
  return withAutoTable.lastAutoTable?.finalY ?? 40;
}

function totalBlock(doc: jsPDF, total: number, currency: string) {
  const y = getFinalY(doc) + 10;
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text(`Total: ${formatCurrency(total, currency)}`, 196, y, {
    align: "right",
  });
  return y;
}

export function buildQuotationPdf(quotation: Quotation, client: Client) {
  const doc = new jsPDF();
  header(doc, "Cotización", quotation.folio, quotation.createdAt);

  doc.setFontSize(10);
  doc.setTextColor(51, 65, 85);
  doc.text(`Cliente: ${client.name}`, 14, 46);
  doc.text(`Proyecto: ${quotation.projectName}`, 14, 52);

  itemsTable(doc, quotation.items, quotation.currency, 60);
  totalBlock(doc, quotation.total, quotation.currency);

  if (quotation.notes) {
    const y = getFinalY(doc) + 20;
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text("Notas:", 14, y);
    doc.text(doc.splitTextToSize(quotation.notes, 180), 14, y + 5);
  }

  return doc;
}

export function buildPurchaseOrderPdf(po: PurchaseOrder) {
  const doc = new jsPDF();
  header(doc, "Orden de compra", po.folio, po.createdAt);

  doc.setFontSize(10);
  doc.setTextColor(51, 65, 85);
  doc.text(`Proveedor: ${po.supplierName}`, 14, 46);
  if (po.supplierContact) {
    doc.text(`Contacto: ${po.supplierContact}`, 14, 52);
  }

  itemsTable(doc, po.items, po.currency, 60);
  totalBlock(doc, po.total, po.currency);

  if (po.notes) {
    const y = getFinalY(doc) + 20;
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text("Notas:", 14, y);
    doc.text(doc.splitTextToSize(po.notes, 180), 14, y + 5);
  }

  return doc;
}
