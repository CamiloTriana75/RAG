Guia rapida: desplegar backend en Render (Supabase + Redis gestionado)
========================================================================

Contexto
--------

- Frontend ya desplegado por separado (ej: Vercel).
- Este documento cubre solo el backend NestJS en Render.
- El repositorio ya incluye [render.yaml](../render.yaml).

1) Recursos previos
-------------------

- Proyecto PostgreSQL en Supabase (con extension `vector` habilitada).
- Proyecto Redis gestionado para BullMQ (URL de conexion).

2) Crear el servicio desde Blueprint
------------------------------------

1. En Render, selecciona "New" -> "Blueprint".
2. Conecta este repo.
3. Render detectara [render.yaml](../render.yaml) y creara el servicio `rag-backend`.

Notas importantes del blueprint actual:

- Usa `runtime: docker`.
- Usa `dockerContext: backend` para monorepo (evita fallos de build).
- Define disco persistente en `/app/uploads` para archivos temporales de ingestion.

3) Completar variables de entorno en Render
-------------------------------------------

Variables minimas:

- `NODE_ENV=production`
- `DB_HOST` (usa Session Pooler de Supabase, no el host directo `db.<project-ref>.supabase.co`)
- `DB_PORT=5432` (Session Pooler)
- `DB_USERNAME` (formato pooler: `postgres.<project-ref>`)
- `DB_PASSWORD`
- `DB_NAME`
- `DB_SSL=true`
- `REDIS_URL` (ejemplo: `rediss://:<password>@<host>:<port>`)
- `JWT_SECRET` (si no existe, Render lo genera por `generateValue: true`)

Nota de troubleshooting:

- Si ves `ENETUNREACH` con una direccion `2600:...` en logs de Render, estas usando un host IPv6-only.
- Cambia a Session Pooler (`aws-0-<region>.pooler.supabase.com`) y usa `DB_USERNAME=postgres.<project-ref>`.

Variables opcionales/recomendadas:

- `OPENROUTER_API_KEY` (requerida para respuestas de chat)
- `OPENROUTER_MODELS`
- `OPENROUTER_REFERER`
- `OPENROUTER_TITLE`
- `INGESTION_JOB_TIMEOUT_MS=600000` (10 minutos por job)
- `INGESTION_INSERT_BATCH_SIZE=100` (insercion por lotes de chunks)
- `EXCEL_PROCESS_ALL_SHEETS=false` (por defecto procesa solo la primera hoja)

Nota sobre Excel:

- El endpoint `POST /documents/upload` acepta un campo opcional `sheet`.
- `sheet` puede ser nombre de hoja (ej. `Resumen`) o indice (ej. `2` para segunda hoja).

4) Orden correcto para inicializar BD
-------------------------------------

El script [backend/scripts/init-db.sql](../backend/scripts/init-db.sql) ya es autosuficiente:

- habilita `vector` y `pgcrypto`
- crea las tablas base si no existen
- agrega el indice vectorial con fallback a `ivfflat`

Orden recomendado:

1. Ejecutar [backend/scripts/init-db.sql](../backend/scripts/init-db.sql) sobre la base vacia.
2. Desplegar el backend con `DB_SYNCHRONIZE=false`.

Si prefieres dejar que TypeORM cree las tablas en un primer arranque, puedes poner `DB_SYNCHRONIZE=true` temporalmente, pero ya no es necesario.

5) Ejecutar init-db.sql en Supabase
-----------------------------------

PowerShell:

```powershell
$env:PGPASSWORD='tu_password'; psql "postgresql://tu_usuario:tu_password@tu_host:5432/tu_db?sslmode=require" -f backend/scripts/init-db.sql
```

Tambien puedes pegar el SQL en el editor SQL de Supabase.

Si Supabase no permite `hnsw` en tu tier, usa este indice alternativo:

```sql
CREATE INDEX IF NOT EXISTS idx_chunks_embedding_ivf
  ON document_chunks
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);
```

6) Verificacion post-deploy
---------------------------

- `https://<tu-backend>.onrender.com/health`
- `https://<tu-backend>.onrender.com/api/docs`
- Prueba real: login -> upload -> espera ingestion -> consulta RAG

7) Conectar frontend desplegado
-------------------------------

En tu frontend (Vercel), define:

- `NEXT_PUBLIC_API_URL=https://<tu-backend>.onrender.com`

8) Limitaciones actuales a considerar
-------------------------------------

- El backend guarda archivos en `./uploads` antes de procesarlos.
- Con disco persistente no puedes escalar a multiples instancias en Render.
- Si mas adelante quieres escalar horizontal, migra uploads a almacenamiento de objetos (S3 compatible).
