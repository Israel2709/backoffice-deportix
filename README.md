# DeportiX Backoffice

Back Office Next.js para administrar datos deportivos consumidos por App QD, conectado a [deportix-api](../deportix-api).

Referencia funcional/visual: `docs/deportix-backoffice.docx` y `docs/htmls/` (V3).

## Stack

- Next.js 15 (App Router) + React 19 + TypeScript
- Tailwind CSS
- react-hook-form + Zod
- TanStack Query
- sonner

## Requisitos

1. Node.js 20+
2. `deportix-api` corriendo en `http://localhost:3001` (`npm run dev:api` en ese repo)

## Configuración

```bash
cp .env.example .env.local
```

Variables:

```
DEPORTIX_API_BASE_URL=http://localhost:3001
ADMIN_API_KEY=dev-local-key
```

La API key **nunca** se expone al browser: el BFF en `/api/proxy/*` la inyecta solo para rutas `/admin/*`.

## Desarrollo

En dos terminales:

```bash
# deportix-api
npm run dev:api

# deportix-backoffice
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

## Fase 1 (actual — UI)

- Shell V3: Inicio | Datos Maestros | Operación Deportiva
- Inicio: health, stats, sync jobs/logs
- Hubs por deporte con listados read-only desde `/api`
- Stubs de captura profunda
- **Sin login** (auth diferida)

## Fase 2 (API — lista)

CRUD admin de fútbol en `deportix-api`: ver `../deportix-api/docs/ADMIN_CRUD_SOCCER.md`.

Cliente tipado: [`lib/api/admin-soccer.ts`](lib/api/admin-soccer.ts).

## Fase 3 (UI captura fútbol — lista)

- Maestros: `/datos-maestros/futbol/estructura` y `/equipos` con alta/edición
- Operación: Competición → Temporadas → tabs General | Participantes | Estructura | Partidos | Clasificación
- Tablas consolidadas, sticky save y dirty guard (`beforeunload`)
- Rutas: `/operacion/futbol/[leagueId]/[seasonId]/…`

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
```
