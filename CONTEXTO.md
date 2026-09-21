# Contexto — Librería Fusión

Documento de contexto del proyecto. Tiene dos partes:

- **Parte 1 — La tienda nueva (este repo).** Cómo está hecha, con qué reglas se toca
  y qué trampas tiene. Es lo que hay que leer antes de meter mano.
- **Parte 2 — La auditoría de la tienda vieja** (Tienda Nube, 28/08/2026). Se conserva
  porque explica el **porqué** de casi todo lo de la Parte 1: cada hallazgo de ahí
  tiene su contramedida acá.

Para levantar el proyecto y ver el checklist de lo hecho, ver [README.md](README.md).

---

# Parte 1 — La tienda nueva

## 1.1 Qué es

Tienda online a medida de **Librería Fusión** (librería/papelera en Villa Bosch,
Tres de Febrero, Bs. As.). Reemplaza la tienda de Tienda Nube, que se abandonó
después de la auditoría de la Parte 2 en vez de parcharla.

Incluye storefront público + panel de administración propio. **No hay cuentas de
cliente**: se compra sin registrarse.

**Dónde corre:** https://libreriafusion.com.ar — VPS de Contabo (`37.60.252.163`),
el mismo server que corre artmuebles y n8n. nginx del host termina el TLS con un
certificado Origin de Cloudflare y proxea al contenedor en `127.0.0.1:3001`.
Código y compose del server en `/opt/libreria-fusion`. La URL vieja
`zestech.com.ar/libreria` redirige acá (ver 1.7).
Es un ambiente de **staging**: la tienda que hoy atiende clientes sigue siendo la de
Tienda Nube (y está cerrada al público).

## 1.2 Stack

| Pieza | Elección |
|---|---|
| Framework | Next.js 15 (App Router, Server Components, Server Actions) |
| Lenguaje | TypeScript estricto |
| Estilos | Tailwind v4 — la config vive en `@theme` dentro de `src/app/globals.css`, no hay `tailwind.config` |
| Base | PostgreSQL 17 + Prisma 6 |
| Pagos | Mercado Pago Checkout Pro (Preferences + webhook) |
| Mails | nodemailer sobre SMTP de Gmail |
| Deploy | Docker (`output: "standalone"`), `docker-compose.prod.yml` |

Sin librerías de UI, de estado ni de auth. Todo lo que hay es Next + Prisma + zod +
bcryptjs + nodemailer. Antes de sumar una dependencia, fijate si no alcanza con 30
líneas propias (caso testigo: `src/lib/csv.ts`).

## 1.3 Reglas del negocio

- **La plata se guarda SIEMPRE en centavos** (`Int`). Nunca floats. `src/lib/money.ts`
  es el **único** lugar que traduce entre centavos y lo que ve o escribe una persona.
- **El precio y el stock viven en `ProductVariant`, nunca en `Product`.** Todo producto
  tiene al menos una variante (la genérica se llama "Único").
- **El cliente nunca manda el precio.** El carrito guarda solo `{variantId, quantity}`
  en localStorage; `src/lib/checkout.ts` lo reresuelve contra Postgres. El precio
  autoritativo sale de ahí y de ningún otro lado.
- **El stock se descuenta al confirmarse el pago**, no antes, y una sola vez
  (idempotente por `providerPaymentId`).
- **Los `OrderItem` guardan una foto del momento de la compra** (nombre y precio
  copiados): editar el catálogo no reescribe el historial de pedidos.
- **Retiro en el local por defecto.** Existe envío a domicilio, pero es solo un
  formulario de dirección: **no hay costo de envío calculado ni integración con
  correos**, se coordina a mano. Pagando en efectivo no se puede pedir envío.
- **Los medios de pago son datos, no código** (`PaymentMethod`): sumar "efectivo al
  retirar" es insertar una fila y prenderla desde el admin.
- **Los textos del local son datos** (`StoreSetting`): horarios, dirección, WhatsApp,
  aviso de retiro. Se editan en `/admin/ajustes`. `src/lib/settings.ts` tiene defaults
  para que la tienda renderice aunque la tabla esté vacía.
- **Cancelar un pedido ya pagado reembolsa por MP y repone stock.** Si el reembolso
  falla, el pedido **no** se cancela: no se deja al cliente cobrado y sin producto.

## 1.4 Mapa del código

```
prisma/
  schema.prisma        catálogo, pedidos, pagos, admin, settings, FAQ
  seed.ts              categorías, medios de pago, productos de ejemplo
  create-admin.ts      alta de admin (NO corre en el seed: no hornear passwords)
src/
  app/
    layout.tsx         raíz mínima: html/body + globals.css. robots: noindex (ver 1.7)
    (store)/           storefront, con header/footer/carrito propios
    admin/             panel, con su chrome (no arrastra el header de la tienda)
    api/admin/upload/  subida de fotos (POST, requiere sesión de admin)
    api/mp/webhook/    webhook de Mercado Pago
    uploads/[file]/    sirve las fotos subidas — LEER 1.6, no es decorativo
  components/          UI compartida; los "use client" son la excepción, no la regla
  lib/
    db.ts              cliente Prisma (singleton; sin esto, dev satura Postgres)
    money.ts           centavos <-> pesos, única fuente de verdad
    cart.ts            lógica pura del carrito (sin React ni DOM: corre en ambos lados)
    checkout.ts        resuelve el carrito contra la base — frontera de confianza
    auth.ts            sesión de admin: token HMAC en cookie httpOnly, 8 h
    settings.ts        textos del local, con defaults
    orders.ts          vencimiento de pedidos impagos
    alerts.ts          alertas del panel, derivadas en vivo
    sales.ts           estadísticas de ventas, derivadas en vivo
    mercadopago.ts     única capa que sabe de MP
    email.ts           mails transaccionales, gateados por SMTP_PASS
    uploads.ts         carpeta de fotos + validación de nombres
```

### Convenciones

- **Server Components por defecto.** `"use client"` solo donde hay interacción real
  (carrito, formularios, toggles).
- **Mutaciones por Server Actions**, en un `actions.ts` al lado de la página. Toda
  acción de admin arranca con `await requireAdmin()`.
- **Los módulos que tocan la base o secretos llevan `import "server-only"`.**
- **Comentarios en castellano y sobre el porqué**, no sobre el qué. Si un archivo
  existe por una razón no obvia, esa razón va escrita arriba de todo (ejemplo
  canónico: `src/app/uploads/[file]/route.ts`).
- **Nada de tablas para lo que se puede derivar:** `alerts.ts` y `sales.ts` calculan
  todo en vivo desde `Order` / `ProductVariant`.
- **No hay cron.** El vencimiento de pedidos impagos (`expireStaleOrders`) lo dispara
  cada página que lista pedidos: es un UPDATE indexado e idempotente.

## 1.5 Accesibilidad (acá no es opcional)

La tienda vieja tenía **1.53:1** de contraste en el precio y en el botón de comprar
(WCAG AA pide 4.5:1). La paleta de `globals.css` existe para arreglar exactamente eso:

- `--color-brand` (`#C2185B`, 5.8:1 sobre blanco) es **el único rosa que puede llevar
  texto encima**.
- Los decorativos (`accent-fuchsia`, `accent-green`, `accent-yellow`) son para bloques
  e ilustraciones: **nunca texto encima**.
- `alt` es obligatorio a nivel de formulario en `ProductImage` — la tienda vieja tenía
  imágenes sin alt.

Antes de meter un color nuevo, verificá el ratio.

## 1.6 Trampas conocidas (leer antes de tocar)

### Las fotos subidas NO se sirven como estáticos de Next

En producción Next lista el contenido de `public/` **una sola vez, al arrancar el
server**, y se queda con esa lista en memoria. Todo archivo que aparezca en `public/`
después del arranque devuelve **404 hasta el próximo reinicio**. En `next dev` no pasa
(chequea el filesystem en cada request), así que el bug es invisible en local y solo
aparece en el server.

Ese fue exactamente el síntoma de "subo una foto y no se ve".

Por eso las fotos las sirve `src/app/uploads/[file]/route.ts`, que lee del disco en el
momento. Las que ya existían al arrancar las sigue sirviendo Next como estáticas
(matchea primero): mismo archivo, mismo resultado.

**Corolario:** cualquier cosa que se escriba en disco en runtime y haya que servir
después necesita su propia ruta. No alcanza con dejarla en `public/`.

### basePath

**Hoy el basePath está vacío** y la tienda vive en la raíz de su dominio, así que
esto no muerde. Queda escrito porque estuvo bajo `/libreria` hasta el 21/09/2026 y
porque vuelve a aplicar si alguna vez se sirve en un subdirectorio.

`NEXT_PUBLIC_BASE_PATH`
**se hornea en `next build`** (está como `ARG` en el Dockerfile): ponerlo solo como env
de runtime NO alcanza. Consecuencias:

- `next/link` y `next/router` prefijan solos. **`next/image` no**: el `src` tiene que
  traer el basePath ya puesto. Por eso `/api/admin/upload` devuelve
  `${NEXT_PUBLIC_BASE_PATH}/uploads/<nombre>` y eso es lo que se guarda en la base.
  **Consecuencia que costó una migración:** al sacar el basePath, las 96 filas de
  `ProductImage` que tenían `/libreria/uploads/...` quedaron apuntando a la nada y
  hubo que reescribirlas con un UPDATE. Si el basePath vuelve a cambiar, acordarse
  de la base.
- Un `fetch` desde el cliente a una ruta propia también lo necesita (ver `BASE` en
  `src/components/image-manager.tsx`).

### Páginas que consultan Postgres

Van con `export const dynamic = "force-dynamic"`, si no `next build` intenta
prerenderarlas sin base y falla.

### Migraciones desde Windows

El `DATABASE_URL` del `.env` apunta a `localhost:5432` (Prisma corre fuera de Docker);
el del compose apunta a `db`. No son el mismo valor, y está bien así.

### Mercado Pago en modo prueba

El entorno de prueba **rechaza reembolsos** de pagos de usuarios de test
("Unauthorized use of live credentials"). El happy-path de cancelar un pedido pagado
solo se puede verificar con la cuenta real de la librería.

### El server

ufw solo permite 80/443 desde IPs de Cloudflare, así que todo dominio tiene que estar
Proxied (nube naranja) en Cloudflare. Verificar siempre desde el propio server con
`curl --resolve zestech.com.ar:443:127.0.0.1 -k`. **No tocar** el contenedor de n8n ni
artmuebles, que viven en el mismo VPS.

## 1.7 Mudanza a libreriafusion.com.ar

Relevado el 20/09/2026 con `whois` y `dig`:

| Dato | Valor |
|---|---|
| Titular | CUIT 27240307583 (MINUTTI CYNTHIA LORENA) — la dueña, no un tercero |
| Registrar | NIC.ar directo, sin intermediarios |
| Vence | 07/04/2027 |
| DNS delegado a | Route 53 de Amazon (`awsdns-*`) — lo maneja Tienda Nube |
| Registros | `A @ → 185.133.35.13` y `.14`, `CNAME www → libreriafusion.mitiendanube.com` |
| Correo | **no tiene**: sin MX, sin SPF, sin subdominios. Usan Gmail común |

**No hace falta transferir el dominio.** Alcanza con controlar el DNS, y que el
titular siga siendo la dueña es lo correcto (además, la renovación es de ella).

El único trámite que depende de ella: entrar a **nic.ar con su Clave Fiscal** y
cambiar la delegación de los `awsdns-*` a los nameservers de Cloudflare.

### Orden de la mudanza (los pasos 2 y 3 van separados a propósito)

1. Crear la zona en Cloudflare **replicando los registros de arriba**, en **DNS
   only (nube gris)**. Hecho el 20/09/2026 en la cuenta de Federico; los
   nameservers asignados son `ernest.ns.cloudflare.com` y
   `hadlee.ns.cloudflare.com`. Proxiar las IPs de Tienda Nube rompe su SSL y su ruteo por
   host: la nube naranja recién va cuando el dominio apunte a nuestro server.
2. La dueña cambia los nameservers en nic.ar. **HECHO el 21/09/2026**: cargados
   12:17, zona `.ar` publicada y Cloudflare activo 12:57. Verificado: los
   resolvers públicos devuelven `ernest` y `hadlee`, los registros siguen
   apuntando a Tienda Nube y tanto la raíz como `www` responden 200. **Sin caída.**

   > Entre que el NIC guarda el cambio y publica la zona hay un rato (40 minutos
   > esta vez) en el que el whois ya muestra los nameservers nuevos pero el DNS
   > todavía no: Cloudflare marca "Invalid nameservers" y el dominio resuelve
   > para unos sí y para otros no. Es esperable, se acomoda solo.

   > Para delegar a un proveedor externo va **"Agregar una nueva delegación"**, con
   > el hostname completo y las IP **vacías**. **"Autodelegar"** es para servidores
   > dentro del propio dominio y exige IP: usarlo da "nombre del host inválido" y
   > después "debe contener al menos una IP". Al final hay que apretar
   > **"Ejecutar Cambios"** o no se guarda nada. Propaga en minutos u horas, y
   mientras tanto **el sitio sigue siendo el de Tienda Nube**: nadie se entera.
3. Cuando la tienda nueva esté lista, apuntar el registro al VPS y pasar a nube
   naranja. Instantáneo y reversible en segundos.

Separar 2 de 3 es lo que saca el riesgo: el trámite con la dueña se hace una vez y
sin apuro, y el cambio real se decide otro día.

### Qué cambia de nuestro lado en el paso 3

**Hecho el 21/09/2026** (falta solo apuntar los registros DNS al VPS):

- Bloque de nginx en `sites-available/libreriafusion`, con certificado Origin de
  Cloudflare en `/etc/nginx/ssl/libreriafusion.{pem,key}` (vence en 2041, solo vale
  detrás de la nube naranja). `www` redirige al dominio pelado.
- `client_max_body_size 8m`: el default de nginx es 1 MB y cortaba con un 413 la
  subida de cualquier foto más pesada que eso, antes de que la app se enterara.
- **Todo el sitio detrás del basic auth** (usuario `fusion`) hasta que salga
  productiva: el dominio figura en las bolsas y en el Instagram del local, así que
  no puede mostrar una tienda a medio terminar. Para abrirla se borran dos líneas
  del `location /`. El webhook de MP queda siempre abierto.
- `zestech.com.ar/libreria` redirige al dominio nuevo conservando la ruta, salvo el
  webhook de MP, que sigue proxeado (un 301 no garantiza que se reenvíe el POST).
- `NEXT_PUBLIC_BASE_PATH` **vacío** (la tienda pasa de `/libreria` a la raíz) y
  `NEXT_PUBLIC_SITE_URL=https://libreriafusion.com.ar`. Las dos se hornean en el
  build → **rebuild obligatorio**, no alcanza con el `.env`.
- Las back_urls y la notification_url de MP salen de `SITE_URL` y se reapuntan
  solas, pero hay que actualizar la URL del webhook en el panel de Mercado Pago.
- Sacar el `robots: noindex` de `src/app/layout.tsx`.
- **Decidir el esquema de acceso al panel.** Hoy `/libreria/admin` está detrás de
  un `auth_basic` de nginx (usuario `fusion`) que hace de segunda cerradura, porque
  el login propio no limita intentos. El 20/09/2026 ese candado dejó afuera a la
  dueña: tenía la credencial guardada en el navegador y al renombrarse el realm
  el navegador dejó de mandarla (se destrabó pasándole las credenciales el
  21/09). Desde el 21/09 el login de la app tiene freno propio
  (`src/lib/login-throttle.ts`: 5 intentos fallidos por cuenta y 15 minutos de
  espera), así que el `auth_basic` ya no es la única defensa y se puede sacar
  para que la dueña maneje una sola contraseña. Se decide al armar el nginx del
  dominio nuevo, para no rehacerlo dos veces.
- La tienda de Tienda Nube deja de responder en ese dominio.

## 1.8 Estado

La tienda **todavía no está abierta al público**: `src/app/layout.tsx` fuerza
`robots: { index: false }`. Sacar ese flag es parte de la apertura, no antes.

Pendientes reales:

- Cargar `SMTP_PASS` (contraseña de aplicación de Gmail) para activar los mails.
- Cuenta de Mercado Pago de la librería (hoy corre con vendedor de prueba).
- Cargar el catálogo de verdad (la tienda vieja tenía 2 SKUs publicados).

El README tiene el checklist largo de lo ya hecho.

## 1.9 Cómo verificar un cambio

```bash
npm run typecheck     # tipos
npm run build         # que compile y que las rutas salgan como se espera
```

Para probar algo que **solo falla en producción** (como el bug de las fotos), no
alcanza con `npm run dev`: hay que `npm run build && npx next start`, porque varias
diferencias de comportamiento viven exactamente en ese borde.

**Deploy:** tar del proyecto local → scp a `/opt/libreria-fusion` →
`docker compose -f docker-compose.prod.yml up -d --build`.

---

# Parte 2 — Auditoría de la tienda vieja (Tienda Nube)

> Relevada el **28/08/2026** con la tienda desbloqueada. Se conserva porque explica
> **por qué** la tienda nueva está hecha como está. Cambio de reglas posterior a la
> auditoría: originalmente se definió que **no había envíos**; hoy hay envío a
> domicilio coordinado a mano (ver 1.3).

## 2.1 Datos del negocio

| Dato | Valor |
|---|---|
| Nombre | libreria Fusion |
| Sitio | https://www.libreriafusion.com.ar/ |
| Plataforma | **Tienda Nube** (store id `003/664/909`) |
| CUIT | 27240307583 |
| Dirección | Santos Vega 7196, Villa Bosch — Tres de Febrero (Bs. As.) |
| Horarios | Lun–Vie 9:00–13:00 y 16:00–19:30 · Sáb 9:00–13:00 |
| Email | fusionlibreriapapelera@gmail.com |
| Instagram | https://instagram.com/fusionlibreria |
| Facebook | https://www.facebook.com/libreriafusion/ |
| TikTok | https://www.tiktok.com/@fusion.libreria |
| Rubro | Librería / papelera / artículos comerciales y escolares |

**Estado actual:** la tienda está **cerrada al público**, detrás de la pantalla de contraseña de Tienda Nube ("volvemos pronto! gracias por la paciencia"). Todo lo de abajo se relevó con la tienda desbloqueada.

---

## 2.2 Arquitectura del sitio

```
/                          Home
/productos/                Listado general (2 productos)
/escolar1/                 Categoría "ESCOLAR" (1 producto)  <- slug feo
/papelera/                 Categoría "EMBALAJE" (VACÍA)
/como-comprar/             Página informativa
/politica-de-devolucion/   Página informativa
/quienes-somos/            Página informativa
/contacto/                 Formulario + datos
/search/?q=...             Buscador (funciona OK)
/account/login|register    Cuentas
```

### Catálogo actual

Solo **2 productos publicados**:

1. *Cuaderno Éxito E3 Tipo ABC x48 hojas Rayado forrado negro con lunares blancos* — $10.900
   · categoría ESCOLAR · variantes de color (6) · marca Éxito
2. *Masa Ultra Liviana Playlife Muresco 15 Colores Surtidos* — $7.700
   · **sin categoría** (breadcrumb: Inicio > Productos)

Cuotas: 3 sin interés configuradas.

---

## 2.3 Hallazgos de la auditoría

### Críticos — rompen la navegación o la venta

1. **El menú "Productos" lleva a una categoría vacía.**
   En el header y el footer, el link "Productos" apunta a `/papelera/`, que es la categoría **EMBALAJE** y **no tiene ningún producto**: el usuario ve *"No tenemos resultados para tu búsqueda"*. Debería apuntar a `/productos/`.
   Es el error más grave: el acceso principal al catálogo termina en una página en blanco.

2. **Las tres tarjetas de la home no son clickeables.**
   Los bloques *LINEA ESCOLAR / LINEA COMERCIAL / LINEA PAPELERA* son imágenes con texto, **sin ningún `<a>`**. Son el elemento visual dominante de la home y no llevan a ningún lado.

3. **La home no muestra ni un solo producto.**
   Estructura actual: banner → 3 tarjetas muertas → newsletter → feed de Instagram → footer. No hay "Destacados", "Novedades" ni "Más vendidos". Nada para comprar en la portada.

4. **Contraste de color ilegible en toda la tienda.**
   El color primario del tema es un rosa muy claro `#F8BBD0` usado a la vez como color de texto y como fondo de botones, con texto casi blanco `#FAF9F6` encima.
   Ratios medidos (WCAG AA exige **4.5:1**):

   | Elemento | Ratio | Estado |
   |---|---|---|
   | Menú principal (Inicio, Productos, …) | **1.53:1** | falla |
   | Precio del producto ($10.900) | **1.53:1** | falla |
   | Botón "AGREGAR AL CARRITO" | **1.53:1** | falla |
   | Botón "INICIAR COMPRA" (carrito) | **1.53:1** | falla |
   | "Crear cuenta" / "Iniciar sesión" | **1.81:1** | falla |
   | Links del footer | **1.53:1** | falla |

   El precio y el botón de compra son, literalmente, lo más difícil de leer de la página.
   **Fix de una sola línea:** cambiar el color primario del tema por un rosa saturado (ej. `#E0218A`, el mismo fucsia de la tarjeta ESCOLAR, o `#D6336C`). Arregla decenas de elementos de golpe.

5. **"Cómo Comprar" tiene el texto de ejemplo de Tienda Nube sin editar.**
   La página arranca con: *"Dejá instrucciones a tus clientes sobre cómo hacer una compra. Por ejemplo:"* — es el placeholder de la plantilla, visible para el cliente.
   Además tiene comillas dobles mal escapadas: `""Agregar al carrito""`.

6. **WhatsApp y teléfono mal cargados.**
   - WhatsApp: `https://wa.me/5401131305791` → el `0` de `011` **invalida el número** en formato internacional. Debería ser `https://wa.me/5491131305791`.
   - Teléfono: `tel:77248998` → 8 dígitos, **falta el código de área** (y probablemente un dígito).
   Ambos aparecen en el footer de todas las páginas, en la página de contacto y en el botón flotante de WhatsApp.

### Importantes — pérdida de conversión

7. **No existe la categoría COMERCIAL.** La home promociona tres líneas pero solo hay dos categorías reales, y una está vacía. La promesa no coincide con el catálogo.

8. **Nombres de categorías inconsistentes.** La home dice "LINEA PAPELERA", el breadcrumb dice "EMBALAJE" y la URL es `/papelera/`. Tres nombres para lo mismo.

9. **Sin calculadora de envío.** Ni en la ficha de producto ni en el carrito aparece el "Calculá el costo de envío". El cliente no sabe cuánto le sale hasta llegar al checkout.

10. **Fichas de producto desparejas.**
    - El cuaderno tiene una descripción de 3 renglones en MAYÚSCULAS mezcladas con minúsculas (`cuaderno exito e3  tipo ABC` / `TAPA DURA FORRADOS CON LUNARES BLANCO`), con doble espacio y sin punto final. La masa Playlife sí tiene una descripción bien redactada.
    - Variantes de color con capitalización mezclada: `Negro, Azul, Rosa, Amarillo, lila, verde oscuro`.
    - Sin stock visible, sin SKU, sin medidas.
    - Media ficha queda en blanco: mucho espacio vacío a la derecha de la descripción.

11. **Title de producto que no coincide con el producto.**
    El `<title>` del cuaderno es `CUADERNO EXITO E3 48 HOJAS RAYADAS FORRADO` (todo en mayúsculas, sin la marca de la tienda), mientras el H1 es "Cuaderno Éxito E3 Tipo ABC x48 hojas Rayado forrado negro con lunares blancos".

12. **Búsqueda sin resultados = callejón sin salida.** `/search/?q=lapiz` devuelve "No hubo resultados para tu búsqueda" y nada más: ni sugerencias, ni productos relacionados, ni link al catálogo.

13. **Slug `escolar1`.** La categoría ESCOLAR quedó con URL `/escolar1/`, con un `1` heredado de un intento previo. Malo para SEO y para compartir el link.

### Menores / SEO

14. **Meta description rota en categoría:** *"Comprá online productos de ESCOLAR **desde .** Tenemos…"* — falta el precio en el texto autogenerado.
15. **3 de 10 imágenes de la home sin atributo `alt`.**
16. **Newsletter sin gancho.** "Recibí todas las ofertas" sin beneficio concreto (ej. "10% off en tu primera compra").
17. **`og:image` es el logo** y va por `http://` (no `https://`) — el preview al compartir en WhatsApp o redes queda pobre.
18. **Datos estructurados:** hay `Organization` + `WebPage` (bien), pero **no hay schema `Product`** con precio y disponibilidad.
19. **Sin Google Analytics ni GTM.** Solo está el píxel de **Facebook (`fbq`)**. No hay forma de medir tráfico ni embudo de compra.

### Lo que está bien

- Rendimiento correcto: TTFB ~474 ms, `load` ~614 ms, 31 requests. No es un problema.
- Buscador con filtros por color, marca y precio, y ordenamientos completos.
- Breadcrumbs presentes y correctos.
- "Quiénes Somos" y "Política de Devolución" están redactadas de verdad (esta última cita las leyes 24240 y 26361).
- Botón de arrepentimiento y link a Defensa del Consumidor presentes (obligatorios en Argentina).
- Carrito funciona bien: agregar, modificar cantidad y eliminar sin errores.
- Redes sociales bien enlazadas en header, footer y bloque de Instagram.
- Banda de WhatsApp flotante siempre visible (aunque el número esté mal, ver punto 6).
- Identidad visual con personalidad: la paleta rosa/fucsia/verde/amarillo es simpática y funciona para el rubro — el problema no es la paleta, es **cómo se aplica al texto**.

---

## 2.4 Plan sugerido

### Antes de reabrir la tienda (bloqueantes)

1. Corregir el link "Productos" del menú → `/productos/`.
2. Hacer clickeables las 3 tarjetas de la home (o reemplazarlas por categorías reales).
3. Cambiar el color primario del tema a un rosa saturado → arregla el contraste global.
4. Reescribir "Cómo Comprar" con el proceso real de la tienda.
5. Arreglar WhatsApp (`5491131305791`) y el teléfono del footer.
6. Cargar productos: con 2 SKUs la tienda no es viable. Priorizar la línea ESCOLAR (temporada) y crear/llenar COMERCIAL y PAPELERA.

### Segunda tanda

7. Activar productos destacados en la home.
8. Configurar y mostrar la calculadora de envío.
9. Unificar nombres de categorías (PAPELERA vs EMBALAJE) y arreglar el slug `escolar1`.
10. Normalizar descripciones y variantes de todos los productos con una plantilla común.
11. Instalar Google Analytics 4 / GTM.

### Tercera tanda

12. Cupón de bienvenida para el newsletter.
13. `alt` en todas las imágenes y `og:image` en https.
14. Titles y meta descriptions propios por producto.

---

## 2.5 Cómo volver a auditar

El sitio está protegido por la pantalla de contraseña de Tienda Nube (`/password/`). Hay que desbloquearlo manualmente en el navegador antes de recorrerlo; después la cookie queda en la sesión. La contraseña **no se guarda en este documento** a propósito.

Herramientas usadas en esta pasada: Claude in Chrome (navegación, screenshots, inspección del DOM y cálculo de ratios de contraste vía JS).

### Verificado en esta auditoría

Home · /productos/ · /escolar1/ · /papelera/ · ambas fichas de producto · /como-comprar/ · /quienes-somos/ · /politica-de-devolucion/ · /contacto/ · buscador (con y sin resultados) · agregar al carrito, ver carrito y vaciar carrito.

### Pendiente de verificar

- **Vista mobile**: no se pudo forzar el viewport a 420 px en esta sesión (la ventana volvía a 1920). Dado que la mayoría del tráfico de una tienda así es mobile, conviene revisarla a mano.
- **Checkout completo**: no se avanzó más allá del carrito para no generar pedidos de prueba. Queda por verificar medios de pago activos, métodos de envío y costos reales.
