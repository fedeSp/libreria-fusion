# Librería Fusión — tienda online

Reemplazo a medida de la tienda de Tienda Nube. Next.js 15 + Prisma + Postgres, todo en Docker.

El **porqué** de cada decisión está en [CONTEXTO.md](CONTEXTO.md): es la auditoría de la
tienda anterior, y varias cosas de acá existen para no repetir lo que fallaba ahí.

## Reglas del negocio

- **No hay envíos.** Todos los pedidos se retiran en el local de Villa Bosch. El aviso
  aparece en la franja superior, en cada ficha, en el carrito y en el checkout.
- **Se paga con Mercado Pago** (Checkout Pro). El pago en efectivo al retirar está
  modelado y sembrado, pero desactivado: se prende desde el admin, sin tocar código.
- **La plata se guarda en centavos** (`Int`). Nunca floats.

## Levantar el proyecto

Necesitás Docker Desktop corriendo.

```bash
cp .env.example .env
```

```bash
docker compose up -d --build
```

La primera vez, aplicá las migraciones y sembrá datos de ejemplo:

```bash
npx prisma migrate dev
```

```bash
npm run db:seed
```

La tienda queda en http://localhost:3000 y Postgres en `localhost:5432`.

> Las migraciones se corren desde Windows contra `localhost:5432`, no dentro del contenedor.
> Por eso el `DATABASE_URL` del `.env` apunta a `localhost` y el de `docker-compose.yml` a `db`.

## Comandos

| Comando | Qué hace |
|---|---|
| `docker compose up -d` | Levanta Postgres + la app |
| `docker compose logs -f web` | Logs de la app |
| `docker compose down` | Baja todo (los datos sobreviven en el volumen) |
| `npm run db:migrate` | Crea y aplica una migración nueva |
| `npm run db:seed` | Vuelve a sembrar datos |
| `npm run db:studio` | Abre Prisma Studio para mirar la base |
| `npm run db:reset` | Borra la base y la reconstruye desde cero |
| `npm run typecheck` | Chequeo de tipos |

## Estructura

```
prisma/
  schema.prisma      modelo de datos (catálogo, pedidos, pagos, admin)
  seed.ts            categorías, medios de pago, productos de ejemplo
src/
  app/
    page.tsx                    home
    productos/                  catálogo + búsqueda
    productos/[slug]/           ficha de producto
    categoria/[slug]/           listado por categoría
    como-comprar/ contacto/ quienes-somos/
    devoluciones/ arrepentimiento/
  components/        header, footer, tarjeta de producto, aviso de retiro
  lib/
    db.ts            cliente Prisma (singleton)
    money.ts         centavos <-> pesos, única fuente de verdad
    settings.ts      textos y datos del local, editables desde la base
```

## Estado

Hecho:

- [x] Infra Docker (Postgres 17 + app) y modelo de datos completo
- [x] Storefront: home, catálogo con búsqueda y orden, ficha, categorías
- [x] Páginas informativas y las obligatorias por normativa argentina
- [x] Paleta accesible (contraste 5.8:1 donde antes había 1.53:1)
- [x] Deploy en https://zestech.com.ar/libreria (ver deploy abajo)
- [x] Carrito (localStorage + revalidación server-side) y checkout
- [x] Creación de pedido con precios/stock recalculados desde la base
- [x] Integración Mercado Pago Checkout Pro (preferencia) + webhook de confirmación
- [x] Descuento de stock al confirmarse el pago (no antes)

- [x] Pago de prueba verificado end-to-end (webhook confirma y descuenta stock)
- [x] Panel de administración: login, pedidos, productos/stock, ajustes
- [x] ABM de productos completo (alta con variantes e imágenes por URL, baja con guarda)
- [x] Cancelar un pedido pagado reembolsa por MP y repone stock (bloquea si el refund falla)
- [x] Mail al admin cuando se confirma un pago (gated en config SMTP)

- [x] Subida de fotos propia desde el admin (volumen persistente) + alertas en el panel

Pendiente:

- [ ] Job que cancele pedidos vencidos (expiresAt) y libere el intento
- [ ] Cargar `SMTP_PASS` (app password de Gmail) para activar los mails
- [ ] Cuenta de MP de la librería (producción real) — hoy corre con vendedor de prueba

## Subida de fotos

`POST /api/admin/upload` (requiere sesión de admin) guarda la imagen en
`public/uploads/` (configurable con `UPLOADS_DIR`) y devuelve su URL. En producción
ese directorio es un volumen Docker (`fusion_uploads`), así las fotos sobreviven a
los rebuilds. El gestor de imágenes vive en la ficha de edición del producto
(subir, borrar, elegir portada). Límite 5 MB; JPG/PNG/WEBP/GIF.

Las fotos **no las sirve el estático de Next**, las sirve `src/app/uploads/[file]/route.ts`.

> **Por qué.** En producción Next lista el contenido de `public/` una sola vez, al
> arrancar el server, y se queda con esa lista en memoria. Cualquier archivo que
> aparezca en `public/` después del arranque devuelve **404 hasta el próximo
> reinicio**: era exactamente el síntoma de "subo una foto y no se ve". En `next dev`
> no pasa, porque ahí Next chequea el filesystem en cada request — por eso en local
> funcionaba. La ruta lee el archivo del disco en el momento, así una foto recién
> subida se ve al instante. Las que ya existían al arrancar las sigue sirviendo Next
> como estáticas (matchea primero): mismo archivo, mismo resultado.

La ruta solo acepta nombres `[A-Za-z0-9._-]` con extensión de imagen conocida, así que
no se puede usar para leer otros archivos del server (`/uploads/../../.env` da 404).

## Instagram en la home

El bloque "Seguinos en Instagram" (debajo del aviso de retiro) muestra hasta **6
posteos** elegidos a mano. Se cargan en *Ajustes → Posteos de Instagram para la
home*: se pega el link, se toca **Agregar** y el posteo aparece embebido ahí
mismo, con una ✕ para quitarlo — se ve lo que se va a publicar antes de guardar.
Si no hay ninguno, la sección **no se renderiza**: mejor que no exista a que quede
un título con un hueco abajo.

El editor (`src/components/instagram-posts-field.tsx`) guarda la lista en un input
oculto, un link por línea, así la acción que graba los ajustes no necesita saber
nada de él. El `<blockquote>` de cada miniatura se inyecta a mano en vez de dejarlo
en manos de React: el widget de Instagram **reemplaza** ese nodo por un iframe, y si
fuera un nodo de React, al quitar un posteo React intentaría borrar un elemento que
ya no está en el DOM.

No se usa la API de Instagram a propósito: pide app de Meta, revisión y un token
que caduca cada 60 días. Para una librería que postea cada tanto es mucho más de lo
que hace falta. Se usa el widget oficial de embebido, igual que en ART Muebles.

`src/lib/instagram.ts` normaliza lo que se pega: descarta lo que no sea un link de
posteo (el perfil, texto suelto), saca los parámetros de seguimiento (`?igsh=...`),
convierte `/reels/` en `/reel/` y quita duplicados.

## Mails (switch por contraseña)

El envío está gateado por `SMTP_PASS`: el host (`smtp.gmail.com`), puerto (587) y
usuario (la casilla de la tienda) ya vienen por defecto. Para activar los mails
alcanza con agregar **solo `SMTP_PASS`** (contraseña de aplicación de Gmail) al
`.env` del server y recrear el contenedor. Sin ella, no se manda nada y nada falla.

## Reembolsos

Cancelar un pedido en estado pagado (`PAGADO`/`EN_PREPARACION`/`LISTO_PARA_RETIRAR`)
dispara `refundPayment` (MP `POST /v1/payments/{id}/refunds`), repone el stock y marca
el pago `REEMBOLSADO`. Si el reembolso falla, el pedido **no** se cancela (no se deja al
cliente cobrado sin producto). Cancelar un pedido sin pagar no reembolsa nada.

> Nota: el entorno de PRUEBA de Mercado Pago rechaza reembolsos de pagos de
> usuarios de test ("Unauthorized use of live credentials"), así que el happy-path
> solo se puede verificar en producción con la cuenta real de la librería.

## Panel de administración

`/admin` — protegido por login (cookie de sesión firmada con HMAC, `ADMIN_SESSION_SECRET`).
El storefront vive en el route group `(store)` con su chrome; el admin trae el suyo.

- **Pedidos**: lista filtrable por estado + detalle con transiciones válidas
  (`PENDIENTE_PAGO → PAGADO → EN_PREPARACION → LISTO_PARA_RETIRAR → ENTREGADO`, o CANCELADO).
- **Productos**: lista con toggles activo/destacado; edición de textos, categoría,
  y precio/stock por variante.
- **Ajustes**: textos de la tienda (horarios, aviso de retiro, contacto, redes) — se
  guardan en `StoreSetting` y alimentan header, footer y avisos. Ahí también se cargan
  los posteos de Instagram que se muestran en la home (ver abajo).

Crear/actualizar el admin (no corre en el seed automático, para no hornear una
contraseña en prod):

```bash
docker compose exec -e ADMIN_EMAIL=vos@mail.com -e ADMIN_PASSWORD='...' -e ADMIN_NAME='Fede' web npx tsx prisma/create-admin.ts
```

## Flujo de compra

1. `AddToCart` (cliente) guarda `{variantId, quantity}` en localStorage — nunca el precio.
2. `/carrito` y `/checkout` llaman a `resolveCartAction`, que reresuelve las líneas
   contra Postgres (`src/lib/checkout.ts`): precio y stock autoritativos.
3. `createCheckout` (`src/app/checkout/actions.ts`) valida contacto (zod), crea el
   `Order` en `PENDIENTE_PAGO` con sus `OrderItem` (nombre y precio copiados), y crea
   la preferencia de Mercado Pago (`src/lib/mercadopago.ts`). Devuelve el `init_point`.
4. El cliente redirige a Mercado Pago. Al volver cae en `/pedido/[number]`.
5. MP notifica a `/api/mp/webhook`: verifica firma, consulta el pago real a MP,
   marca el pedido `PAGADO` y **descuenta stock** (idempotente, una sola vez).

Sin `MP_ACCESS_TOKEN` el pedido se crea igual y la página de pedido queda en
"falta el pago"; al cargar el token, el paso 3-4 se activa solo.

## Deudas conocidas

- `npm audit` reporta vulnerabilidades en dependencias de build (postcss vía Next,
  deepmerge-ts vía Prisma). Son de tiempo de compilación, no del runtime de la tienda;
  se resuelven actualizando Next y Prisma cuando publiquen los parches.
- Prisma avisa que `package.json#prisma` queda deprecado en la v7. Migrar a
  `prisma.config.ts` cuando actualicemos.
