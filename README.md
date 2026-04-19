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

## Despliegue Completo (Frontend + Backend + BD)

El repositorio incluye un stack de despliegue en `docker-compose.deploy.yml` con:

- Frontend Next.js
- Backend NestJS
- PostgreSQL (pgvector)
- Redis
- pgAdmin para visualizar BD

### 1) Preparar variables de despliegue

```bash
cp .env.deploy.example .env.deploy
```

Edita `.env.deploy` y ajusta especialmente:

- `OPENROUTER_API_KEY`
- `JWT_SECRET`
- `NEXT_PUBLIC_API_URL` (URL publica del backend)
- Passwords de base de datos y pgAdmin

### 2) Levantar todo el stack

```bash
docker compose -f docker-compose.deploy.yml --env-file .env.deploy up -d --build
```

Tambien tienes scripts de atajo desde raiz:

```bash
npm run deploy:up
npm run deploy:logs
npm run deploy:down
```

### 3) Inicializar pgvector e indices

En Linux/macOS (bash):

```bash
docker compose -f docker-compose.deploy.yml --env-file .env.deploy exec -T postgres psql -U raguser -d ragdb < backend/scripts/init-db.sql
```

En Windows PowerShell:

```powershell
Get-Content backend/scripts/init-db.sql | docker compose -f docker-compose.deploy.yml --env-file .env.deploy exec -T postgres psql -U raguser -d ragdb
```

### 4) Accesos

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
