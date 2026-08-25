import { NextRequest, NextResponse } from "next/server";

const GRAPH_VERSION = "v20.0";

export async function POST(req: NextRequest) {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneNumberId) {
    return NextResponse.json(
      {
        error:
          "WhatsApp Cloud API no está configurado. Define WHATSAPP_TOKEN y WHATSAPP_PHONE_NUMBER_ID para enviar automáticamente, o usa el enlace de WhatsApp manual.",
      },
      { status: 501 }
    );
  }

  const body = await req.json().catch(() => null);
  if (!body?.to) {
    return NextResponse.json(
      { error: "Falta el número de teléfono destino (to)." },
      { status: 400 }
    );
  }

  const to = String(body.to).replace(/[^0-9]/g, "");

  const message = body.documentUrl
    ? {
        messaging_product: "whatsapp",
        to,
        type: "document",
        document: {
          link: body.documentUrl,
          filename: body.filename || "documento.pdf",
          caption: body.caption || undefined,
        },
      }
    : {
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body: body.text || "" },
      };

  const resp = await fetch(
    `https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(message),
    }
  );

  const data = await resp.json().catch(() => ({}));

  if (!resp.ok) {
    return NextResponse.json(
      { error: data?.error?.message || "Error al enviar por WhatsApp." },
      { status: resp.status }
    );
  }

  return NextResponse.json({ ok: true, data });
}
