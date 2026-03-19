# Estándares de Código

Este documento define la filosofía de calidad del proyecto y los criterios que usamos
para tomar decisiones técnicas de forma consistente.

Es una guía de referencia para mantener un código que el equipo pueda entender,
extender y operar con seguridad a largo plazo.

La versión operativa para agentes de IA está en [AGENTS.md](../AGENTS.md).

## Propósito

Nuestro estándar busca equilibrar cinco objetivos principales:

- Claridad: que cualquier persona del equipo pueda leer y entender el código.
- Mantenibilidad: que los cambios futuros sean simples y de bajo riesgo.
- Robustez: que el sistema falle de forma controlada y predecible.
- Seguridad: que los límites de entrada/salida estén protegidos.
- Rendimiento: que las decisiones técnicas prioricen eficiencia real.

## Principios de Ingeniería

Aplicamos principios clásicos de ingeniería limpia:

- Simplicidad sobre complejidad: resolver el problema sin sobreingeniería.
- Cohesión y separación de responsabilidades: cada módulo debe tener un propósito claro.
- DRY con criterio: reutilizar cuando mejora claridad y reduce riesgo.
- Mejora continua: dejar el código mejor que como se encontró.
- Causa raíz: corregir el origen del problema, no solo el síntoma visible.

## Enfoque de Arquitectura

La arquitectura se entiende como contratos claros entre capas, no como una restricción burocrática.

- Configuración, utilidades, librerías, funcionalidades y aplicación deben mantenerse desacopladas.
- Los módulos deben ser pequeños, composables y orientados a responsabilidades concretas.
- La complejidad de bordes (validaciones, análisis de texto, estados límite) debe encapsularse para no dispersarse por el código.
- El flujo debe favorecer lectura descendente: de lo público/general a lo interno/específico.

## Legibilidad y Mantenibilidad

Un cambio es de calidad cuando puede ser mantenido por alguien distinto a su autor.

- Nombrado claro, sin ambigüedades ni abreviaciones opacas.
- Funciones con una intención clara y efectos laterales controlados.
- Código explícito antes que “ingenioso”.
- Comentarios solo donde agregan contexto de intención, compensaciones o riesgo.
- Evitar ruido visual y lógica innecesaria.

## Seguridad y Límites de Confianza

Toda entrada externa debe tratarse como no confiable.

- Validar datos que provienen de DOM, API, URL y canales de mensajería.
- Sanitizar y controlar cómo se renderiza contenido dinámico.
- Limitar dependencias y superficies de ataque.
- Preferir patrones que minimicen errores de seguridad por defecto.

## Rendimiento por Diseño

Rendimiento no es optimización prematura; es diseño consciente.

- Diseñar rutas críticas para evitar trabajo redundante.
- Reducir operaciones costosas en interfaz y manipulación de DOM.
- Favorecer actualizaciones incrementales sobre recargas amplias.
- Mantener mensajería entre contextos con protocolos explícitos y mínimos.

## Cultura de Pruebas y Validación

La validación es parte del diseño, no una etapa posterior.

- Todo cambio debe tener evidencia de funcionamiento (automática o manual).
- Las pruebas deben priorizar legibilidad, independencia y repetibilidad.
- Las regresiones deben convertirse en casos de verificación permanentes.
- Cuando no hay prueba automatizada viable, se documenta un escenario manual claro.
- La estructura de pruebas debe reflejar la estructura de módulos (`src/features/*` -> `tests/unit/features/*`) para facilitar mantenimiento y trazabilidad.

### Reglas de lint para pruebas

Para evitar falsos positivos en `tests/**/*.test.js`:

- `eslint` debe ejecutarse sobre `src/` y `tests/`.
- La configuración de ESLint debe incluir `globals.vitest` para pruebas (`describe`, `it`, `expect`, etc.).
- Las reglas de arquitectura por capas (`boundaries`) no se aplican en tests.
- Si se agregan nuevos archivos de prueba, deben quedar bajo `tests/**` para heredar estas reglas automáticamente.

## Política de Idioma y Documentación

Para mantener consistencia del repositorio:

- Código, identificadores y comentarios técnicos: inglés.
- Documentación general del proyecto: español.
- `docs/BUILD_INSTRUCTIONS.md`: inglés.
- Títulos de documentos Markdown: español cuando el documento esté en español.

## Criterios de Decisión

Cuando existen varias soluciones posibles, se prioriza:

1. Corrección funcional y seguridad.
2. Claridad de implementación.
3. Coste de mantenimiento futuro.
4. Impacto en rendimiento y estabilidad.
5. Tamaño y riesgo del cambio.

## Mejora Continua

Este estándar es evolutivo. Se actualiza cuando el proyecto crece, cambia su arquitectura
o aparecen nuevos riesgos.

La meta no es cumplir reglas por cumplir, sino sostener una base de código sana,
entendible y confiable para el equipo.

## Modularización de Features

Cuando una feature crece y mezcla varias responsabilidades (DOM, parsing, formateo, persistencia):

- Mantener en la feature solo la orquestación de UI y flujo.
- Mover lógica pura/reutilizable a `src/utils/*`.
- Mantener funciones pequeñas y orientadas a un propósito.
- Evitar que un único archivo concentre múltiples “sub-features” sin separación.
- Si dos features repiten la misma regla de negocio, extraer un helper compartido en `utils` y reutilizarlo en ambas (evitar duplicación entre módulos de dominio).

Ejemplo aplicado: en clientes, la lógica de nombre para aprovisionamiento y parsing de plantilla se encapsula en utilidades dedicadas para reducir acoplamiento del módulo principal.
