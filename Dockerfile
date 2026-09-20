# syntax=docker/dockerfile:1

# ---------- base ----------
FROM node:22-alpine AS base
# Prisma necesita openssl para generar/usar el engine en Alpine.
RUN apk add --no-cache openssl
WORKDIR /app

# ---------- deps ----------
FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm install

# ---------- dev ----------
FROM base AS dev
ENV NODE_ENV=development
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
EXPOSE 3000
CMD ["npm", "run", "dev"]

# ---------- build ----------
FROM base AS build
ENV NODE_ENV=production
# basePath y site URL se hornean en `next build`, así que tienen que estar
# presentes como ENV ANTES del build, no solo en runtime.
ARG NEXT_PUBLIC_BASE_PATH=""
ARG NEXT_PUBLIC_SITE_URL="http://localhost:3000"
ENV NEXT_PUBLIC_BASE_PATH=$NEXT_PUBLIC_BASE_PATH
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate && npm run build

# ---------- runner (producción) ----------
FROM base AS runner
ENV NODE_ENV=production
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001
COPY --from=build /app/public ./public
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
# Next escribe el caché de imágenes optimizadas en .next/cache en runtime;
# el usuario no-root necesita poder crearlo, si no tira EACCES en cada imagen.
# public/uploads recibe las fotos subidas desde el admin (montado como volumen
# en prod): se crea con dueño nextjs para que el volumen herede ese permiso.
RUN mkdir -p .next/cache public/uploads && chown -R nextjs .next public/uploads
USER nextjs
EXPOSE 3000
ENV PORT=3000 HOSTNAME=0.0.0.0
CMD ["node", "server.js"]
