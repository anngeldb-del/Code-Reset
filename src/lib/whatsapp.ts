export function normalizePhone(phone: string) {
  return phone.replace(/[^0-9]/g, "");
}

export function buildWhatsAppLink(phone: string, message: string) {
  const digits = normalizePhone(phone);
  const text = encodeURIComponent(message);
  return `https://wa.me/${digits}?text=${text}`;
}

export function quotationMessage(params: {
  clientName: string;
  projectName: string;
  folio: string;
  totalFormatted: string;
}) {
  return [
    `Hola ${params.clientName} 👋, te compartimos la cotización *${params.folio}* de Code Reset para el proyecto "${params.projectName}".`,
    ``,
    `Total: ${params.totalFormatted}`,
    ``,
    `En breve te enviamos el PDF adjunto con el detalle. Cualquier duda, quedamos atentos.`,
  ].join("\n");
}

export function purchaseOrderMessage(params: {
  supplierName: string;
  folio: string;
  totalFormatted: string;
}) {
  return [
    `Hola ${params.supplierName}, les compartimos la orden de compra *${params.folio}* de Code Reset.`,
    ``,
    `Total: ${params.totalFormatted}`,
    ``,
    `Adjuntamos el PDF con el detalle de la orden. Gracias.`,
  ].join("\n");
}
