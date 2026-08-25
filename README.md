# Code Reset — Panel de proyectos y pagos

Panel interno de **Code Reset**, para administrar clientes, proyectos y pagos,
generar cotizaciones y órdenes de compra, enviarlas por WhatsApp y exportar
reportes en Excel.

## Funcionalidades

- **Login de un solo administrador** con Firebase Authentication.
- **Clientes**: alta, edición y ficha con teléfono, correo y acceso directo a WhatsApp.
- **Proyectos**: estado, presupuesto, fechas y cliente asociado.
- **Pagos parciales / abonos**: registro de pagos por proyecto con cálculo automático
  de saldo pendiente y **recibo imprimible** por cada pago.
- **Dashboard**: ingresos totales, saldo pendiente, proyectos activos y gráfica de
  ingresos por mes.
- **Cotizaciones**: formato profesional con logo, folio, datos de contacto, marca/modelo
  y descuento por concepto, IVA opcional y condiciones comerciales (forma de pago, tiempo
  de entrega, garantía, instalación, transporte). PDF descargable y envío por WhatsApp
  con el mensaje ya redactado.
- **Órdenes de compra**: mismo formato y flujo que las cotizaciones, para tus proveedores.
- **Reportes en Excel (.xlsx)**: pagos (con filtro de fechas), proyectos, clientes
  y cotizaciones.

## Stack técnico

- [Next.js](https://nextjs.org) (App Router) + TypeScript + Tailwind CSS
- [Firebase](https://firebase.google.com): Authentication + Firestore (+ Storage opcional)
- `jspdf` / `jspdf-autotable` para generar PDFs
- `exceljs` para generar reportes `.xlsx`
- `recharts` para las gráficas del dashboard

## 1. Instalar dependencias

```bash
npm install
```

## 2. Crear tu proyecto de Firebase

1. Ve a [console.firebase.google.com](https://console.firebase.google.com) y crea
   un proyecto nuevo (por ejemplo `code-reset`).
2. **Authentication** → pestaña *Sign-in method* → habilita **Correo electrónico/contraseña**.
3. **Authentication** → pestaña *Users* → **Add user**: crea tu único usuario admin
   (tu correo y una contraseña segura). Con ese usuario iniciarás sesión en la app.
4. **Firestore Database** → **Crear base de datos** → modo producción → elige la
   región más cercana.
5. (Opcional, solo si quieres subir los PDF de cotizaciones/órdenes a un enlace
   público para enviarlos automáticamente por WhatsApp) **Storage** → **Comenzar**.
6. En **Configuración del proyecto** (ícono de engrane) → *Tus apps* → agrega una
   **app web** (ícono `</>`). Copia los valores del `firebaseConfig` que te muestra.

## 3. Variables de entorno

Copia el archivo de ejemplo y complétalo con los valores del paso anterior:

```bash
cp .env.local.example .env.local
```

```
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
```

## 4. Reglas de seguridad de Firestore

El archivo `firestore.rules` ya está listo (solo usuarios autenticados pueden
leer/escribir, ideal para un admin único). Publícalo con la
[CLI de Firebase](https://firebase.google.com/docs/cli):

```bash
npm install -g firebase-tools
firebase login
firebase use --add        # selecciona tu proyecto de Firebase
firebase deploy --only firestore:rules
```

## 5. Ejecutar en desarrollo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000), inicia sesión con el usuario
admin que creaste en el paso 2 y ¡listo!

## 6. Envío de cotizaciones y órdenes por WhatsApp

Por defecto, el botón **💬 WhatsApp** descarga el PDF y abre un enlace `wa.me`
con el mensaje ya redactado para el número del cliente/proveedor — no requiere
ninguna configuración adicional, solo adjuntas el PDF descargado dentro de
WhatsApp Web o la app.

Si prefieres enviar el mensaje **automáticamente** (sin abrir WhatsApp
manualmente) usando la API oficial de Meta:

1. Crea una app de WhatsApp Business en [developers.facebook.com](https://developers.facebook.com/docs/whatsapp/cloud-api/get-started).
2. Obtén tu `WHATSAPP_TOKEN` (token de acceso permanente) y tu `WHATSAPP_PHONE_NUMBER_ID`.
3. Agrégalos a `.env.local`.
4. El endpoint `POST /api/whatsapp/send` (`src/app/api/whatsapp/send/route.ts`)
   queda disponible para integrarlo donde lo necesites — recibe `{ to, text }`
   o `{ to, documentUrl, filename, caption }`.

## 7. Marca (logo y datos de contacto en los documentos)

El logo y los datos que aparecen en el encabezado de cotizaciones, órdenes de
compra y recibos (nombre, eslogan, contacto, correo, WhatsApp) están centralizados
en `src/lib/business.ts`. Para cambiarlos, edita ese archivo. El logo se sirve
desde `public/logo-mark.jpg` (el ícono cuadrado) — para reemplazarlo, sustituye
ese archivo por tu propia imagen cuadrada.

## 8. Reportes en Excel

Desde **Reportes** puedes exportar `.xlsx` de pagos (con filtro de rango de
fechas), proyectos, clientes y cotizaciones — se generan en el navegador con
`exceljs`, sin necesidad de backend adicional.

## 9. Desplegar

La forma más simple es [Vercel](https://vercel.com):

```bash
npm run build
```

Sube el repositorio a Vercel (o a tu hosting de Next.js preferido) y define ahí
las mismas variables de entorno de `.env.local`.

## Estructura del proyecto

```
src/
  app/
    login/                 # Login del admin
    (app)/                 # Rutas protegidas (requieren sesión)
      dashboard/
      clients/
      projects/
      quotations/
      purchase-orders/
      reports/
    api/whatsapp/send/     # Endpoint opcional de WhatsApp Cloud API
  components/               # UI compartida (botones, tarjetas, modales, sidebar)
  context/AuthContext.tsx   # Sesión del admin (Firebase Auth)
  hooks/                    # Hooks de datos en tiempo real (Firestore)
  lib/                      # Firebase, Firestore, PDF, Excel, WhatsApp, formato
  types/                    # Tipos compartidos (Cliente, Proyecto, Pago, etc.)
```
