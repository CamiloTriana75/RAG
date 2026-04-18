# Servidor RAG Con NestJS

Servidor RAG construido con NestJS para autenticacion, ingesta de documentos, indexacion semantica y respuestas con contexto usando OpenRouter y pgvector.

## Estado Actual Del Proyecto

- Compilacion: `npm run build` correcta.
- Prueba E2E base: `npm run test:e2e` correcta.
- API documentada con Swagger en `/api/docs`.
- Flujo principal completo: registro/login -> carga -> ingesta -> consulta RAG.

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

## Inicio Rapido

### Prerrequisitos

- Node.js 20+
- Docker y Docker Compose v2

### Preparacion

1. Clona el repositorio y prepara entorno:

```bash
git clone https://github.com/tu-usuario/rag-backend.git
cd rag-backend
cp .env.example .env
```

2. Levanta infraestructura base:

```bash
docker compose up -d postgres redis
```

3. Inicializa la columna vector e indices:

```bash
docker exec -i rag-postgres psql -U raguser -d ragdb < scripts/init-db.sql
```

4. Instala dependencias e inicia API:

```bash
npm install
npm run start:dev
```

5. Abre Swagger:

- http://localhost:3000/api/docs

## Variables De Entorno Clave

| Variable | Requerida | Descripcion |
|---|---|---|
| `OPENROUTER_API_KEY` | Si | Llave de OpenRouter para generar respuestas |
| `OPENROUTER_MODELS` | No | Lista de modelos separados por coma en orden de preferencia |
| `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME` | Si | Conexion PostgreSQL |
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
npm run build
npm run lint
npm run test
npm run test:e2e
```

## Documentacion Organizada

- [Guia de contribucion](CONTRIBUTING.md)
- [Codigo de conducta](CODE_OF_CONDUCT.md)
- [Indice de documentacion tecnica](docs/README.md)
- [Catalogo de incidencias, hitos y Proyecto de GitHub](docs/SCALING_ISSUES_CUSTOMIZABLE.md)

## Contribuciones

Si quieres empezar rapido como colaborador externo:

1. Revisa [CONTRIBUTING.md](CONTRIBUTING.md).
2. Toma una incidencia del catalogo en [docs/SCALING_ISSUES_CUSTOMIZABLE.md](docs/SCALING_ISSUES_CUSTOMIZABLE.md).
3. Abre una solicitud de cambios usando [.github/PULL_REQUEST_TEMPLATE.md](.github/PULL_REQUEST_TEMPLATE.md).
