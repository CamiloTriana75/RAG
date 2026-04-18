# Guia De Contribucion

Gracias por contribuir a este servidor RAG. Esta guia esta pensada para colaboradores internos y externos que quieran aportar con rapidez y calidad.

## Objetivo De Esta Guia

- Reducir el tiempo de incorporacion.
- Mantener consistencia tecnica entre PRs.
- Facilitar la colaboracion entre personas nuevas en el proyecto.

## Flujo Recomendado

1. Haz una bifurcacion del repositorio.
2. Crea una rama desde `main`.
3. Implementa cambios pequenos y atomicos.
4. Ejecuta compilacion, lint y pruebas.
5. Abre una solicitud de cambios (PR) usando la plantilla oficial.

## Preparacion Del Entorno Local

1. Clona tu fork:

```bash
git clone https://github.com/tu-usuario/rag-backend.git
cd rag-backend
```

2. Configura entorno:

```bash
cp .env.example .env
```

3. Levanta infraestructura:

```bash
docker compose up -d postgres redis
```

4. Inicializa pgvector e indices:

```bash
docker exec -i rag-postgres psql -U raguser -d ragdb < scripts/init-db.sql
```

5. Instala dependencias y ejecuta la aplicacion:

```bash
npm install
npm run start:dev
```

## Convenciones De Trabajo

### Nombres De Rama

- `feat/<alcance-corto>`
- `fix/<alcance-corto>`
- `chore/<alcance-corto>`
- `docs/<alcance-corto>`

Ejemplos:

- `feat/rag-reranker`
- `fix/openrouter-rate-limit`
- `docs/actualizar-contribucion`

### Mensajes De Commit

Se recomienda usar una convencion de commits:

- `feat(rag): agregar etapa de reranking`
- `fix(ai): manejar 429 de openrouter con backoff`
- `docs(readme): reorganizar secciones de incorporacion`

## Lista De Verificacion Minima Antes Del PR

Ejecuta:

```bash
npm run build
npm run lint
npm run test
npm run test:e2e
```

Y valida:

- No exponer secretos o llaves en commits.
- Si cambias variables, actualizar `.env.example`.
- Si cambias endpoints, actualizar README y Swagger si aplica.
- Si cambias arquitectura, agregar o actualizar documentacion en `docs/`.

## Criterios De Calidad

### Definicion De Listo (DoR)

Una incidencia esta lista cuando tiene:

- Problema claro y medible.
- Alcance acotado.
- Criterios de aceptacion verificables.
- Dependencias identificadas.

### Definicion De Terminado (DoD)

Un PR esta completo cuando:

- Compilacion, lint y pruebas pasan.
- Se cumplen los criterios de aceptacion.
- La documentacion esta actualizada.
- Riesgos y compensaciones tecnicas estan explicados en el PR.

## Proceso De Pull Request

1. Abre PR hacia `main`.
2. Usa [.github/PULL_REQUEST_TEMPLATE.md](.github/PULL_REQUEST_TEMPLATE.md).
3. Vincula la incidencia (ejemplo: `Cierra #123`).
4. Describe pruebas manuales o automatizadas.
5. Atiende observaciones de revision hasta aprobar.

## Como Elegir Trabajo Para Escalar El Proyecto

Para tomar tareas de crecimiento revisa:

- [docs/SCALING_ISSUES_CUSTOMIZABLE.md](docs/SCALING_ISSUES_CUSTOMIZABLE.md)
- [.github/ISSUE_TEMPLATE/feature_request.md](.github/ISSUE_TEMPLATE/feature_request.md)
- [.github/ISSUE_TEMPLATE/bug_report.md](.github/ISSUE_TEMPLATE/bug_report.md)

## Reglas De Colaboracion

- Mantener tono respetuoso y tecnico.
- No hacer cambios masivos no solicitados.
- Priorizar cambios pequenos y faciles de revisar.
- Si algo no esta claro, abrir primero una incidencia de discusion.

## Contacto

Si tienes dudas de direccion tecnica, abre una incidencia de discusion con contexto, propuesta y riesgos.
