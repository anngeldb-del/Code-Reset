# Code Reset — Panel de proyectos y pagos

Panel interno de **Code Reset**, para administrar clientes, proyectos y pagos,
generar cotizaciones y órdenes de compra, enviarlas por WhatsApp y exportar
reportes en Excel.

Es una **app 100% estática** (HTML/CSS/JS puro, sin servidor) — corre igual que
cualquier otra app HTML/JS que despliegues en GitHub Pages: se sube el
repositorio y ya está en línea, sin depender de Vercel ni de ningún otro
servicio de hosting.

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
  con el mensaje ya redactado (enlace `wa.me`).
- **Órdenes de compra**: mismo formato y flujo que las cotizaciones, para tus proveedores.
- **Reportes en Excel (.xlsx)**: pagos (con filtro de fechas), proyectos, clientes
  y cotizaciones.
- **Modo oscuro**: interruptor en la barra lateral, se recuerda entre sesiones.
- **Diseño responsive**: menú de hamburguesa en celular/tablet, misma app instalable
  como PWA desde el navegador.
- **Diagrama de Gantt** (`/projects/gantt`): línea de tiempo de todos los proyectos
  por fecha de inicio/entrega, con filtro por estado.
- **Paginación**: los listados de clientes, proyectos, cotizaciones y órdenes de
  compra cargan por páginas en lugar de traer todo de una vez.

## Stack técnico

- [Next.js](https://nextjs.org) (App Router, **exportación estática** — `output: "export"`)
  + TypeScript + Tailwind CSS
- [Firebase](https://firebase.google.com): Authentication + Firestore (todo desde el
  navegador, con el SDK del cliente — no hay servidor propio)
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
5. En **Configuración del proyecto** (ícono de engrane) → *Tus apps* → agrega una
   **app web** (ícono `</>`). Copia los valores del `firebaseConfig` que te muestra.
6. **Authentication** → pestaña **Settings** → **Authorized domains** → **Add domain**
   → agrega el dominio donde vas a publicar la app (por ejemplo
   `tu-usuario.github.io`). Sin este paso el login no va a funcionar en producción.

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

Estos valores del SDK web de Firebase **no son secretos** — están pensados para
viajar dentro del código del navegador. La seguridad real la dan las reglas de
Firestore (paso 4) y el login, no ocultar este archivo.

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

El botón **💬 WhatsApp** descarga el PDF y abre un enlace `wa.me` con el mensaje
ya redactado para el número del cliente/proveedor — no requiere ninguna
configuración ni servidor, solo adjuntas el PDF descargado dentro de WhatsApp
Web o la app. Al ser una app 100% estática, no hay forma de enviar el mensaje
de forma automática sin abrir WhatsApp (eso requeriría un servidor).

## 7. Marca (logo y datos de contacto en los documentos)

El logo y los datos que aparecen en el encabezado de cotizaciones, órdenes de
compra y recibos (nombre, eslogan, contacto, correo, WhatsApp) están centralizados
en `src/lib/business.ts`. Para cambiarlos, edita ese archivo. El logo se sirve
desde `public/logo-mark.jpg` (el ícono cuadrado) — para reemplazarlo, sustituye
ese archivo por tu propia imagen cuadrada.

### Ícono de la app (favicon / instalar en el celular)

`public/icons/` trae el logo ya recortado y exportado en todos los tamaños que
piden los navegadores y sistemas operativos (favicon, ícono para iOS "Agregar a
inicio", ícono de Android/PWA y su versión "maskable" con margen de seguridad
para el recorte circular de Android). Están conectados en `src/app/layout.tsx`
(metadatos `icons`) y en `public/manifest.webmanifest`, así que la pestaña del
navegador, el ícono al "Agregar a pantalla de inicio" en Android/iOS y el splash
de la PWA ya muestran el logo real. Si cambias el logo, vuelve a generar estos
archivos a partir de la nueva imagen (recorte cuadrado + `Pillow`/`resize`).

## 8. Reportes en Excel

Desde **Reportes** puedes exportar `.xlsx` de pagos (con filtro de rango de
fechas), proyectos, clientes y cotizaciones — se generan en el navegador con
`exceljs`, sin necesidad de backend adicional.

## 9. Desplegar en GitHub Pages

La app está configurada para exportarse como sitio 100% estático y publicarse
en GitHub Pages automáticamente con GitHub Actions.

**Un solo paso manual, una sola vez:**

1. En GitHub, entra al repositorio → **Settings** → **Pages**.
2. En **Source**, cambia de "Deploy from a branch" a **"GitHub Actions"**.

Eso es todo. A partir de ahí, **cada vez que se suba un cambio a la rama
`main`**, el workflow `.github/workflows/deploy-pages.yml` compila la app
(`next build` con exportación estática) y la publica sola en
`https://<tu-usuario>.github.io/Code-Reset/`. No hay que ejecutar ningún
comando ni tocar ninguna otra configuración.

El workflow ya trae la configuración pública de Firebase incluida (son valores
públicos, ver el punto 3 de arriba). Si en algún momento cambias de proyecto de
Firebase, actualiza esos mismos valores dentro de
`.github/workflows/deploy-pages.yml`.

### Ejecutarlo tú mismo / otro hosting estático

```bash
GITHUB_PAGES=true npm run build
```

Genera la carpeta `out/` con HTML/CSS/JS listos para subir a cualquier hosting
estático (GitHub Pages, Netlify, Firebase Hosting, un servidor propio, etc.).
La variable `GITHUB_PAGES=true` agrega el prefijo `/Code-Reset` a todas las
rutas — si despliegas en la raíz de un dominio (no en un subdirectorio), corre
`npm run build` sin esa variable.

## Estructura del proyecto

```
src/
  app/
    login/                 # Login del admin
    (app)/                 # Rutas protegidas (requieren sesión)
      dashboard/
      clients/
      clients/detail/      # Ficha de cliente (?id=...)
      projects/
      projects/detail/     # Ficha de proyecto (?id=...)
      projects/gantt/      # Diagrama de Gantt
      quotations/
      purchase-orders/
      reports/
  components/               # UI compartida (botones, tarjetas, modales, sidebar)
  context/                  # Sesión del admin y modo oscuro
  hooks/                    # Hooks de datos en tiempo real (Firestore) y paginación
  lib/                      # Firebase, Firestore, PDF, Excel, WhatsApp, formato, basePath
  types/                    # Tipos compartidos (Cliente, Proyecto, Pago, etc.)
```

Las páginas de detalle de cliente/proyecto usan `?id=` en la URL en vez de
`/clients/123` — es lo que permite que la app sea 100% estática (GitHub Pages
no puede generar páginas para IDs que no existían al momento de compilar).
