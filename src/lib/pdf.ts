import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";
import { formatCurrency, formatDate } from "@/lib/format";
import { BUSINESS } from "@/lib/business";
import type {
  Client,
  CommercialTerms,
  Quotation,
  PurchaseOrder,
  PurchaseOrderItem,
  QuotationItem,
} from "@/types";

const ORANGE: [number, number, number] = [234, 88, 12];
const BLACK: [number, number, number] = [0, 0, 0];
const DARK: [number, number, number] = [15, 23, 42];
const GRAY_TEXT: [number, number, number] = [100, 116, 139];
const GRAY_BG: [number, number, number] = [241, 245, 249];

const PAGE_WIDTH = 210;
const MARGIN = 14;
const RIGHT_X = PAGE_WIDTH - MARGIN;
const CONTENT_WIDTH = RIGHT_X - MARGIN;

let cachedLogo: string | null = null;

async function loadLogoDataUrl(): Promise<string | null> {
  if (cachedLogo) return cachedLogo;
  try {
    const resp = await fetch(BUSINESS.logoUrl);
    const blob = await resp.blob();
    cachedLogo = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    return cachedLogo;
  } catch {
    return null;
  }
}

function getFinalY(doc: jsPDF): number {
  const withAutoTable = doc as jsPDF & {
    lastAutoTable?: { finalY: number };
  };
  return withAutoTable.lastAutoTable?.finalY ?? 40;
}

function drawHeader(
  doc: jsPDF,
  logo: string | null,
  docTitle: string,
  folio: string,
  createdAt: number
) {
  if (logo) {
    doc.addImage(logo, "JPEG", MARGIN, 10, 16, 16);
  }
  const textX = MARGIN + 20;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...DARK);
  doc.text(BUSINESS.name, textX, 16);

  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(...GRAY_TEXT);
  doc.text(BUSINESS.tagline, textX, 20.5);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  doc.text(BUSINESS.contactName, textX, 25);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...GRAY_TEXT);
  doc.text(`${BUSINESS.email} · ${BUSINESS.whatsapp}`, textX, 29);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...DARK);
  doc.text(docTitle, RIGHT_X, 16, { align: "right" });

  doc.setFontSize(10);
  doc.setTextColor(...ORANGE);
  doc.text(folio, RIGHT_X, 21.5, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...GRAY_TEXT);
  doc.text(`Emitida: ${formatDate(createdAt)}`, RIGHT_X, 26, {
    align: "right",
  });

  doc.setDrawColor(226, 232, 240);
  doc.line(MARGIN, 33, RIGHT_X, 33);
}

function drawInfoGrid(
  doc: jsPDF,
  rows: [string, string, string, string][]
) {
  const startY = 38;
  const rowHeight = 8.5;
  const boxHeight = rows.length * rowHeight + 4;
  doc.setFillColor(...GRAY_BG);
  doc.roundedRect(MARGIN, startY, CONTENT_WIDTH, boxHeight, 2, 2, "F");

  const col1 = MARGIN + 4;
  const col2 = MARGIN + CONTENT_WIDTH / 2 + 2;

  rows.forEach(([label1, value1, label2, value2], i) => {
    const y = startY + 6 + i * rowHeight;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...GRAY_TEXT);
    doc.text(label1.toUpperCase(), col1, y);
    doc.text(label2.toUpperCase(), col2, y);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(...DARK);
    doc.text(value1 || "—", col1, y + 4);
    doc.text(value2 || "—", col2, y + 4);
  });

  return startY + boxHeight;
}

function drawDescriptionBox(doc: jsPDF, startY: number, description: string) {
  if (!description) return startY;
  const lines = doc.splitTextToSize(description, CONTENT_WIDTH - 10);
  const boxHeight = 10 + lines.length * 4.2;

  doc.setFillColor(...GRAY_BG);
  doc.rect(MARGIN, startY, CONTENT_WIDTH, boxHeight, "F");
  doc.setFillColor(...ORANGE);
  doc.rect(MARGIN, startY, 1.2, boxHeight, "F");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...GRAY_TEXT);
  doc.text("DESCRIPCIÓN DEL PROYECTO", MARGIN + 5, startY + 5.5);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(...DARK);
  doc.text(lines, MARGIN + 5, startY + 10.5);

  return startY + boxHeight + 6;
}

function drawItemsTable(
  doc: jsPDF,
  items: (QuotationItem | PurchaseOrderItem)[],
  currency: string,
  startY: number
) {
  autoTable(doc, {
    startY,
    head: [["#", "Descripción", "Marca/Modelo", "Cant.", "P. Unit.", "Dscto.", "Subtotal"]],
    body: items.map((it, i) => {
      const discount = it.discount ?? 0;
      const subtotal = it.quantity * it.unitPrice * (1 - discount / 100);
      return [
        String(i + 1),
        it.description,
        it.brand || "—",
        String(it.quantity),
        formatCurrency(it.unitPrice, currency),
        discount ? `${discount}%` : "—",
        formatCurrency(subtotal, currency),
      ];
    }),
    headStyles: { fillColor: BLACK, textColor: 255, fontSize: 8 },
    bodyStyles: { fontSize: 8.5, textColor: DARK },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: MARGIN, right: MARGIN },
    columnStyles: {
      0: { cellWidth: 8 },
      3: { cellWidth: 14 },
      4: { cellWidth: 24 },
      5: { cellWidth: 16 },
      6: { cellWidth: 26 },
    },
  });
  return getFinalY(doc) + 8;
}

function itemsSubtotal(items: (QuotationItem | PurchaseOrderItem)[]) {
  return items.reduce((sum, it) => {
    const discount = it.discount ?? 0;
    return sum + it.quantity * it.unitPrice * (1 - discount / 100);
  }, 0);
}

function drawTotals(
  doc: jsPDF,
  startY: number,
  subtotal: number,
  total: number,
  currency: string,
  ivaApplies: boolean
) {
  const labelX = RIGHT_X - 55;
  let y = startY;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...GRAY_TEXT);
  doc.text("Subtotal", labelX, y);
  doc.setTextColor(...DARK);
  doc.text(formatCurrency(subtotal, currency), RIGHT_X, y, { align: "right" });

  y += 5.5;
  doc.setTextColor(...GRAY_TEXT);
  doc.text("IVA", labelX, y);
  doc.setTextColor(...DARK);
  doc.text(
    ivaApplies ? formatCurrency(total - subtotal, currency) : "No aplica / Sin IVA",
    RIGHT_X,
    y,
    { align: "right" }
  );

  y += 3;
  doc.setDrawColor(15, 23, 42);
  doc.line(labelX, y, RIGHT_X, y);

  y += 6;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...DARK);
  doc.text("TOTAL A PAGAR", labelX, y);
  doc.text(formatCurrency(total, currency), RIGHT_X, y, { align: "right" });

  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...GRAY_TEXT);
  doc.text(`Moneda: ${currency}`, RIGHT_X, y, { align: "right" });

  return y + 8;
}

function drawCommercialTerms(doc: jsPDF, startY: number, terms: CommercialTerms & { notes?: string }) {
  const rows: [string, string][] = [
    ["Forma de pago", terms.paymentTerms || "—"],
    ["Tiempo de entrega", terms.deliveryTime || "—"],
    ["Garantía", terms.warranty || "—"],
    ["Instalación", terms.installation || "—"],
    ["Transporte", terms.transport || "—"],
    ["Notas", terms.notes || "—"],
  ];

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...DARK);
  doc.text("CONDICIONES COMERCIALES", MARGIN, startY);

  autoTable(doc, {
    startY: startY + 3,
    body: rows,
    theme: "plain",
    styles: { fontSize: 8.5, cellPadding: 1.5 },
    columnStyles: {
      0: { cellWidth: 40, fontStyle: "bold", textColor: GRAY_TEXT },
      1: { textColor: DARK },
    },
    margin: { left: MARGIN, right: MARGIN },
  });

  return getFinalY(doc) + 10;
}

function drawSignatures(
  doc: jsPDF,
  startY: number,
  leftLabel: string,
  rightLabel: string
) {
  const y = Math.max(startY, 255);
  const leftX1 = MARGIN;
  const leftX2 = MARGIN + 75;
  const rightX1 = RIGHT_X - 75;
  const rightX2 = RIGHT_X;

  doc.setDrawColor(148, 163, 184);
  doc.line(leftX1, y, leftX2, y);
  doc.line(rightX1, y, rightX2, y);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...GRAY_TEXT);
  doc.text(leftLabel, (leftX1 + leftX2) / 2, y + 4.5, { align: "center" });
  doc.text(rightLabel, (rightX1 + rightX2) / 2, y + 4.5, { align: "center" });
}

export async function buildQuotationPdf(quotation: Quotation, client: Client) {
  const doc = new jsPDF();
  const logo = await loadLogoDataUrl();

  drawHeader(doc, logo, "COTIZACIÓN", quotation.folio, quotation.createdAt);

  let y = drawInfoGrid(doc, [
    ["Cliente / Empresa", client.name, "No. Cotización", quotation.folio],
    [
      "Atención a",
      quotation.attentionTo || client.phone || "—",
      "Fecha",
      formatDate(quotation.createdAt),
    ],
    [
      "Dirección",
      client.address || "—",
      "Válida hasta",
      quotation.validUntil ? formatDate(quotation.validUntil) : "—",
    ],
  ]);

  y = drawDescriptionBox(doc, y, quotation.description || quotation.projectName);
  y = drawItemsTable(doc, quotation.items, quotation.currency, y);

  const subtotal = itemsSubtotal(quotation.items);
  y = drawTotals(doc, y, subtotal, quotation.total, quotation.currency, quotation.ivaApplies);
  y = drawCommercialTerms(doc, y, quotation);
  drawSignatures(doc, y, BUSINESS.contactName, "Nombre y firma del cliente");

  return doc;
}

export async function buildPurchaseOrderPdf(po: PurchaseOrder) {
  const doc = new jsPDF();
  const logo = await loadLogoDataUrl();

  drawHeader(doc, logo, "ORDEN DE COMPRA", po.folio, po.createdAt);

  let y = drawInfoGrid(doc, [
    ["Proveedor", po.supplierName, "No. Orden", po.folio],
    ["Atención a", po.supplierContact || "—", "Fecha", formatDate(po.createdAt)],
    [
      "Descripción",
      po.description || "—",
      "Válida hasta",
      po.validUntil ? formatDate(po.validUntil) : "—",
    ],
  ]);

  y = drawItemsTable(doc, po.items, po.currency, y);

  const subtotal = itemsSubtotal(po.items);
  y = drawTotals(doc, y, subtotal, po.total, po.currency, po.ivaApplies);
  y = drawCommercialTerms(doc, y, po);
  drawSignatures(doc, y, BUSINESS.contactName, "Nombre y firma del proveedor");

  return doc;
}
