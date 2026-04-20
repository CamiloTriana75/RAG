# Plataforma RAG Fullstack Con NestJS Y Next.js

Plataforma RAG fullstack con backend NestJS y frontend Next.js para autenticacion, ingesta de documentos, indexacion semantica y consulta guiada.

## Estado Actual Del Proyecto

- Compilacion fullstack: `npm run build:all` correcta.
- Prueba E2E backend: `npm run test:e2e` correcta.
- API documentada con Swagger en `/api/docs`.
- Flujo principal completo: registro/login -> carga -> ingesta -> consulta RAG.
- Frontend base disponible en `frontend/` con autenticacion y gestion documental.

## Arquitectura

### Flujo De Punta A Punta

1. El usuario se autentica con JWT.
2. Sube un archivo en `POST /documents/upload`.
3. Se encola un trabajo en BullMQ (`document-ingestion`).
4. El worker extrae texto, lo divide en fragmentos y genera embeddings locales (`Xenova/all-MiniLM-L6-v2`).
5. Se guardan fragmentos y embeddings en PostgreSQL (`pgvector`).
6. En `POST /rag/query` se hace busqueda vectorial por similitud.
7. Se construye el contexto y se solicita la respuesta a OpenRouter con fallback de modelos.

### Mapa De Modulos

| Modulo | Responsabilidad |
|---|---|
| `auth` | Registro, inicio de sesion, estrategia JWT, guardas y DTOs |
| `users` | Persistencia y consulta de usuarios |
| `documents` | Carga, listado y borrado de documentos |
| `ingestion` | Extraccion de texto, fragmentacion, embeddings y almacenamiento de fragmentos |
| `rag` | Recuperacion semantica y armado de respuesta final |
| `ai` | Embeddings locales y chat completion con OpenRouter |
| `health` | Estado base del sistema y configuracion de OpenRouter |

### Aplicaciones Del Repositorio

| Aplicacion | Ruta | Stack |
|---|---|---|
| Backend API | `backend/` | NestJS + TypeORM + BullMQ |
| Frontend Web | `frontend/` | Next.js App Router + React |

## Inicio Rapido

### Prerrequisitos

- Node.js 20+
- Docker y Docker Compose v2

### Preparacion

1. Clona el repositorio y prepara entorno:

```bash
git clone https://github.com/CamiloTriana75/RAG.git
cd RAG
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
```

2. Levanta infraestructura base:

```bash
docker compose -f backend/docker-compose.yml --env-file backend/.env up -d postgres redis
```

3. Inicializa la columna vector e indices:

```bash
docker exec -i rag-postgres psql -U raguser -d ragdb < backend/scripts/init-db.sql
```

4. Instala dependencias de backend y frontend:

```bash
npm run install:all
```

5. Inicia backend y frontend (en terminales separadas):

```bash
npm run dev:backend
npm run dev:frontend
```

O en una sola terminal:

```bash
npm run dev:all
```

Tambien tienes scripts de coordinacion desde raiz:

```bash
npm run build:all
npm run lint:all
npm run test:all
```

6. Abre API y web:

- API Swagger: http://localhost:3001/api/docs
- Frontend: http://localhost:3000 (o el puerto que asigne Next)

## Despliegue Recomendado

Para este proyecto, la combinacion mas simple y estable es:

- Frontend en Vercel
- Backend en Render
- PostgreSQL con `pgvector` en un servicio gestionado
- Redis gestionado para BullMQ

La razon es practica: el frontend Next.js encaja muy bien en Vercel, pero el backend NestJS de este repo no es solo una API. Tambien procesa cargas de archivos, mantiene colas con BullMQ y ejecuta un worker de ingestion, asi que en Vercel tendrias que reestructurar bastante la arquitectura.

### Frontend En Vercel

1. Conecta la carpeta `frontend/` como proyecto independiente en Vercel.
2. Configura la variable de entorno `NEXT_PUBLIC_API_URL` con la URL publica del backend.
3. Mantén `NEXT_PUBLIC_DEMO_MODE=false` salvo que quieras habilitar el modo demo.
4. Usa el build estandar de Next.js; no hace falta configuracion especial.

### Backend En Render

1. Crea un Web Service apuntando a `backend/`.
2. Usa el comando de inicio por defecto del proyecto: `npm run start:prod`.
3. Configura `PORT` con el valor que Render exponga automaticamente.
4. Carga las variables del backend: `DB_*`, `REDIS_*`, `JWT_SECRET`, `OPENROUTER_API_KEY`, `OPENROUTER_MODELS`, `OPENROUTER_REFERER` y `OPENROUTER_TITLE`.
5. Conserva `backend/uploads` con un disco persistente o migra los archivos a almacenamiento externo, porque la ingesta lee el archivo desde disco antes de procesarlo.

### Base De Datos Y Redis

1. Usa una instancia de PostgreSQL con la extension `pgvector` habilitada.
2. Usa Redis gestionado para BullMQ; no dependas de Redis local en produccion.
3. Ejecuta `backend/scripts/init-db.sql` una sola vez despues de crear la base.

### Variables De Entorno Para Produccion

```bash
cp .env.deploy.example .env.deploy
```

Edita `.env.deploy` y ajusta especialmente:

- `NEXT_PUBLIC_API_URL` con la URL publica del backend
- `OPENROUTER_API_KEY`
- `JWT_SECRET`
- Credenciales de PostgreSQL y Redis
- Credenciales de pgAdmin solo si mantienes ese panel

### Si Quieres Seguir Con Docker

El repositorio tambien conserva un stack completo en `docker-compose.deploy.yml` para un despliegue autogestionado con frontend, backend, PostgreSQL, Redis y pgAdmin.

```bash
docker compose -f docker-compose.deploy.yml --env-file .env.deploy up -d --build
```

Desde raiz tambien tienes los atajos:

```bash
npm run deploy:up
npm run deploy:logs
npm run deploy:down
```

Para inicializar `pgvector` e indices en ese stack:

```bash
Get-Content backend/scripts/init-db.sql | docker compose -f docker-compose.deploy.yml --env-file .env.deploy exec -T postgres psql -U raguser -d ragdb
```

Accesos locales del stack Docker:

- Frontend: http://localhost:3100
- API: http://localhost:3101
- Swagger: http://localhost:3101/api/docs
- pgAdmin: http://localhost:5050

## Variables De Entorno Clave

| Variable | Requerida | Descripcion |
|---|---|---|
| `OPENROUTER_API_KEY` | Si | Llave de OpenRouter para generar respuestas |
| `OPENROUTER_MODELS` | No | Lista de modelos separados por coma en orden de preferencia |
| `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME` | Si | Conexion PostgreSQL |
| `DB_SYNCHRONIZE` | Recomendado | Controla sincronizacion de esquema por TypeORM (`true`/`false`) |
| `REDIS_HOST`, `REDIS_PORT` | Si | Cola BullMQ |
| `JWT_SECRET` | Si | Firma de tokens JWT |
| `CHUNK_SIZE`, `CHUNK_OVERLAP` | No | Parametros de fragmentacion de texto |

## OpenRouter: Modelos Gratuitos Vs Produccion

- Los modelos gratuitos pueden responder con `HTTP 429` por limite de tasa.
- El servicio de IA ya implementa reintentos con backoff y fallback entre modelos.
- Para produccion, usa modelos de pago con mejor disponibilidad:

```env
OPENROUTER_MODELS=openai/gpt-4o-mini,openai/gpt-3.5-turbo,anthropic/claude-3.5-sonnet
```

## Calidad Y Verificacion

```bash
npm run build:all
npm run lint:all
npm run test:all
npm run test:e2e
```

## Documentacion Organizada

- [Guia de contribucion](CONTRIBUTING.md)
- [Codigo de conducta](CODE_OF_CONDUCT.md)
- [Indice de documentacion tecnica](docs/README.md)
- [Arquitectura fullstack organizada](docs/ARQUITECTURA_FULLSTACK.md)
- [Catalogo de incidencias, hitos y Proyecto de GitHub](docs/SCALING_ISSUES_CUSTOMIZABLE.md)

## Contribuciones

Si quieres empezar rapido como colaborador externo:

1. Revisa [CONTRIBUTING.md](CONTRIBUTING.md).
2. Toma una incidencia del catalogo en [docs/SCALING_ISSUES_CUSTOMIZABLE.md](docs/SCALING_ISSUES_CUSTOMIZABLE.md).
3. Abre una solicitud de cambios usando [.github/PULL_REQUEST_TEMPLATE.md](.github/PULL_REQUEST_TEMPLATE.md).
