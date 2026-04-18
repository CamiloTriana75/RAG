# Catalogo De Incidencias Personalizables, Hitos Y Proyecto De GitHub

Este documento es la guia central para:

1. Crear incidencias bien definidas.
2. Organizar el trabajo por hitos.
3. Operar un tablero del Proyecto de GitHub.
4. Planificar e implementar interfaz y servidor de forma coordinada.

## 1) Como usar este documento

1. Elige un hito (`M0`, `M1`, `M2`, `M3`, `M4`).
2. Copia una plantilla de incidencia.
3. Reemplaza los campos entre `{{ }}`.
4. Crea la incidencia en GitHub con etiquetas y hito.
5. Agrega la incidencia al Proyecto de GitHub y asigna estado.

## 2) Campos personalizables

- `{{AREA}}`: `servidor`, `interfaz`, `rag`, `ingestion`, `auth`, `infraestructura`, `documentacion`, `comunidad`.
- `{{PRIORIDAD}}`: `P0`, `P1`, `P2`.
- `{{ESFUERZO}}`: `S`, `M`, `L`, `XL`.
- `{{RESPONSABLE}}`: persona encargada.
- `{{HITO}}`: `M0`, `M1`, `M2`, `M3`, `M4`.
- `{{DEPENDENCIAS}}`: incidencias o PRs bloqueantes.
- `{{INCLUYE}}` y `{{EXCLUYE}}`: limites de alcance.
- `{{CA_1}}`, `{{CA_2}}`, `{{CA_3}}`: criterios de aceptacion medibles.

## 3) Etiquetas recomendadas

### Tipo

- `funcionalidad`
- `error`
- `deuda-tecnica`
- `documentacion`
- `seguridad`

### Area

- `servidor`
- `interfaz`
- `rag`
- `ingestion`
- `infraestructura`
- `comunidad`

### Estado

- `necesita-triaje`
- `preparado`
- `en-progreso`
- `bloqueado`
- `en-revision`
- `hecho`

### Nivel

- `buena-primera-tarea`
- `se-necesita-ayuda`
- `alto-impacto`

## 4) Plantilla maestra de incidencia

```md
## Contexto
{{PROBLEMA}}

## Objetivo
{{OBJETIVO}}

## Alcance
- Incluye: {{INCLUYE}}
- Excluye: {{EXCLUYE}}

## Criterios de aceptacion
- [ ] {{CA_1}}
- [ ] {{CA_2}}
- [ ] {{CA_3}}

## Definicion de Terminado
- [ ] Compilacion y pruebas relevantes pasan
- [ ] Documentacion actualizada
- [ ] PR con evidencia de pruebas

## Metadatos
- Area: {{AREA}}
- Prioridad: {{PRIORIDAD}}
- Esfuerzo: {{ESFUERZO}}
- Hito: {{HITO}}
- Responsable sugerido: {{RESPONSABLE}}
- Dependencias: {{DEPENDENCIAS}}
```

## 5) Hitos propuestos

| Hito | Objetivo | Duracion sugerida | Entregable clave |
|---|---|---|---|
| `M0-Base-Operativa` | Ordenar pendientes, etiquetas y tablero | 1 semana | Proyecto de GitHub funcional con incidencias priorizadas |
| `M1-Confiabilidad-Servidor` | Mejorar confiabilidad de colas, observabilidad y seguridad base | 2 semanas | Servidor estable para mayor carga |
| `M2-Calidad-RAG` | Mejorar recuperacion y calidad de respuesta | 2 semanas | Mejor precision y trazabilidad de fuentes |
| `M3-Interfaz-MVP` | Implementar interfaz de usuario sobre API actual | 3 semanas | Interfaz usable: auth, carga, consulta y estado |
| `M4-Escalado-Producto` | Endurecer CI, pruebas E2E y colaboracion externa | 2 semanas | Flujo sostenible para crecimiento del proyecto |

## 6) Configuracion recomendada del Proyecto de GitHub

### Estructura del tablero

Usar vista tipo tablero con columnas:

1. `Pendiente`
2. `Preparado`
3. `En progreso`
4. `En revision`
5. `Bloqueado`
6. `Hecho`

### Campos personalizados del proyecto

- `Prioridad`: `P0`, `P1`, `P2`
- `Esfuerzo`: `S`, `M`, `L`, `XL`
- `Area`: `servidor`, `interfaz`, `rag`, `infraestructura`, `documentacion`, `comunidad`
- `Hito`: `M0`, `M1`, `M2`, `M3`, `M4`
- `Responsable`: persona
- `Fecha objetivo`: fecha

### Vistas recomendadas

1. `Tablero por estado`: seguimiento diario.
2. `Tabla por hito`: planificacion semanal.
3. `Cronograma`: seguimiento por fecha objetivo.
4. `Enfoque interfaz`: filtro `Area = interfaz`.

### Automatizaciones sugeridas

1. Incidencia nueva -> estado `Pendiente`.
2. Incidencia con responsable y hito -> estado `Preparado`.
3. Incidencia con PR vinculado -> estado `En revision`.
4. Incidencia cerrada -> estado `Hecho`.

## 7) Lista de trabajo por hito (incluye interfaz)

## M0 - Base Operativa

### M0-01 Configurar proyecto de GitHub y taxonomia

**Titulo sugerido:** `[P0][comunidad] Configurar campos, vistas y automatizaciones del Proyecto de GitHub`

- Etiquetas: `documentacion`, `comunidad`, `alto-impacto`
- Criterios de aceptacion:
  - [ ] Proyecto creado con columnas y campos personalizados.
  - [ ] Vistas de tablero, tabla y cronograma configuradas.
  - [ ] Automatizaciones de flujo activas.

### M0-02 Normalizar plantillas de incidencia

**Titulo sugerido:** `[P1][documentacion] Estandarizar plantillas de incidencia con criterios de aceptacion`

- Etiquetas: `documentacion`, `comunidad`
- Criterios de aceptacion:
  - [ ] Plantillas de error y funcionalidad con alcance y criterios.
  - [ ] Plantillas solicitan evidencia de pruebas.
  - [ ] Colaboradores nuevos pueden abrir incidencias completas sin ayuda.

## M1 - Confiabilidad Servidor

### M1-01 Cola de fallos para ingestion

**Titulo sugerido:** `[{{PRIORIDAD}}][ingestion] Implementar cola de fallos para trabajos de ingestion`

- Etiquetas: `funcionalidad`, `servidor`, `alto-impacto`
- Dependencias: `{{DEPENDENCIAS}}`
- Criterios de aceptacion:
  - [ ] Cola de fallos separada para `document-ingestion`.
  - [ ] Registro de causa y metadatos del fallo.
  - [ ] Ruta o vista para inspeccionar trabajos fallidos.

### M1-02 Identificador de correlacion de punta a punta

**Titulo sugerido:** `[{{PRIORIDAD}}][infraestructura] Agregar identificador de correlacion en API y workers`

- Etiquetas: `funcionalidad`, `infraestructura`
- Criterios de aceptacion:
  - [ ] Cada solicitud y trabajo tiene identificador unico.
  - [ ] Los logs incluyen el identificador en API y worker.
  - [ ] Se puede rastrear carga -> ingestion -> consulta.

### M1-03 Limite de tasa en endpoints criticos

**Titulo sugerido:** `[{{PRIORIDAD}}][seguridad] Agregar limite de tasa para auth, carga y consulta`

- Etiquetas: `seguridad`, `servidor`
- Criterios de aceptacion:
  - [ ] Limites por endpoint configurables.
  - [ ] Respuesta `429` estandarizada.
  - [ ] Documentacion de limites actualizada.

## M2 - Calidad RAG

### M2-01 Umbral de similitud configurable

**Titulo sugerido:** `[{{PRIORIDAD}}][rag] Hacer configurable el umbral de similitud`

- Etiquetas: `funcionalidad`, `rag`
- Criterios de aceptacion:
  - [ ] Umbral configurable por entorno.
  - [ ] Valor por defecto documentado.
  - [ ] Validacion de rango segura.

### M2-02 Reordenamiento opcional de contexto

**Titulo sugerido:** `[{{PRIORIDAD}}][rag] Agregar etapa opcional de reranking`

- Etiquetas: `funcionalidad`, `rag`, `alto-impacto`
- Criterios de aceptacion:
  - [ ] Reranking activable con bandera de funcionalidad.
  - [ ] Medicion antes y despues en dataset base.
  - [ ] El flujo actual no se rompe cuando esta desactivado.

### M2-03 Busqueda hibrida lexical y vectorial

**Titulo sugerido:** `[{{PRIORIDAD}}][rag] Implementar recuperacion hibrida lexical + vectorial`

- Etiquetas: `funcionalidad`, `rag`
- Criterios de aceptacion:
  - [ ] Recuperacion dual disponible.
  - [ ] Fusion de puntajes configurable.
  - [ ] Benchmark base documentado.

## M3 - Interfaz MVP

### M3-01 Base de la interfaz

**Titulo sugerido:** `[P0][interfaz] Crear base de aplicacion de interfaz y cliente de API`

- Pila sugerida: `{{PILA_INTERFAZ}}` (ejemplo: Next.js + TypeScript + React Query).
- Etiquetas: `funcionalidad`, `interfaz`, `alto-impacto`
- Criterios de aceptacion:
  - [ ] Aplicacion de interfaz creada en carpeta `frontend/`.
  - [ ] Cliente HTTP centralizado para la API Nest.
  - [ ] Variables de entorno de la interfaz documentadas.

### M3-02 Interfaz de autenticacion

**Titulo sugerido:** `[P0][interfaz] Implementar pantallas de registro e inicio de sesion`

- Etiquetas: `funcionalidad`, `interfaz`
- Criterios de aceptacion:
  - [ ] Pantallas de registro e inicio de sesion funcionales.
  - [ ] Manejo de JWT y sesion en cliente.
  - [ ] Manejo de errores `401` y `409` con mensajes claros.

### M3-03 Carga y listado de documentos

**Titulo sugerido:** `[P0][interfaz] Implementar carga de archivos y listado de documentos`

- Etiquetas: `funcionalidad`, `interfaz`
- Criterios de aceptacion:
  - [ ] Carga de archivos permitidos desde interfaz.
  - [ ] Vista de documentos del usuario.
  - [ ] Estado de procesamiento visible por documento.

### M3-04 Pantalla de consulta RAG

**Titulo sugerido:** `[P0][interfaz] Construir interfaz de consulta RAG con fuentes`

- Etiquetas: `funcionalidad`, `interfaz`, `rag`
- Criterios de aceptacion:
  - [ ] Entrada de pregunta y render de respuesta.
  - [ ] Fuentes mostradas por documento y fragmento.
  - [ ] Estados visuales de carga y error.

### M3-05 Experiencia base adaptable

**Titulo sugerido:** `[P1][interfaz] Aplicar diseno base adaptable para escritorio y movil`

- Etiquetas: `funcionalidad`, `interfaz`
- Criterios de aceptacion:
  - [ ] Interfaz usable en escritorio y movil.
  - [ ] Componentes base reutilizables.
  - [ ] Estados vacios y de error definidos.

## M4 - Escalado De Producto

### M4-01 CI para interfaz y servidor

**Titulo sugerido:** `[P0][infraestructura] Agregar verificaciones de CI para servidor e interfaz`

- Etiquetas: `infraestructura`, `alto-impacto`
- Criterios de aceptacion:
  - [ ] Pipeline ejecuta build/lint/test del servidor.
  - [ ] Pipeline ejecuta build/lint/test de la interfaz.
  - [ ] Verificaciones obligatorias para fusionar a `main`.

### M4-02 Pruebas E2E de flujo completo

**Titulo sugerido:** `[P1][servidor] Agregar pruebas E2E de login, carga y consulta desde interfaz`

- Etiquetas: `funcionalidad`, `interfaz`, `servidor`
- Criterios de aceptacion:
  - [ ] Caso exitoso completo en interfaz.
  - [ ] Caso de error de autenticacion y carga.
  - [ ] Reporte de pruebas integrado en CI.

### M4-03 Programa para colaboradores externos

**Titulo sugerido:** `[P1][comunidad] Lanzar programa de primeras tareas con SLA`

- Etiquetas: `comunidad`, `documentacion`
- Criterios de aceptacion:
  - [ ] Minimo 10 incidencias con etiqueta `buena-primera-tarea`.
  - [ ] SLA de triaje y revision publicado.
  - [ ] Lista de verificacion de incorporacion para nuevos colaboradores.

## 8) Plantilla corta para crear nuevas incidencias

```md
### [{{PRIORIDAD}}][{{AREA}}] {{TITULO_CORTO}}

- Objetivo de negocio: {{OBJETIVO_NEGOCIO}}
- Problema actual: {{PROBLEMA_ACTUAL}}
- Solucion propuesta: {{SOLUCION_PROPUESTA}}
- Hito: {{HITO}}
- Dependencias: {{DEPENDENCIAS}}

Alcance:
- Incluye: {{INCLUYE}}
- Excluye: {{EXCLUYE}}

Criterios de aceptacion:
- [ ] {{CA_1}}
- [ ] {{CA_2}}
- [ ] {{CA_3}}
```

## 9) Orden recomendado de ejecucion

1. Ejecutar `M0` para ordenar pendientes y tablero.
2. Ejecutar `M1` para estabilizar servidor.
3. Ejecutar `M2` para mejorar calidad RAG.
4. Ejecutar `M3` para implementar interfaz funcional.
5. Ejecutar `M4` para endurecer CI y escalar colaboracion externa.
