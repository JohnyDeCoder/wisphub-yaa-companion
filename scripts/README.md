# Estrategia de Lanzamiento y Operación

Este documento describe la estrategia operativa de compilación, lanzamiento y publicación privada
para Firefox en este repositorio.

No es solo una lista de comandos: define el flujo recomendado, los objetivos de cada fase
y los controles mínimos para publicar con seguridad.

## Objetivos Estratégicos

- Publicar cambios de forma predecible y repetible.
- Mantener trazabilidad entre versión, historial de cambios, artefactos y despliegue.
- Minimizar riesgo operativo en cada actualización.
- Facilitar reversión rápida en caso de incidente.

## Modelo de Lanzamiento

El proyecto maneja dos líneas operativas principales:

- **Compilación de desarrollo**: validación funcional y revisión local.
- **Compilación de producción**: empaquetado final para distribución (Chrome + Firefox autoalojado).

Para Firefox privado, el flujo completo incluye:

1. Generar artefactos.
2. Firmar paquete en AMO (`unlisted`).
3. Publicar `.xpi` firmado y `updates.json` en infraestructura propia.

## Fases Operativas

### 1) Puerta de calidad

Antes de preparar un lanzamiento, validar calidad básica:

- lint sin errores;
- pruebas sin errores;
- compilación correcta para los objetivos necesarios;
- documentación e historial de cambios alineados con el cambio.

### 2) Compilación y empaquetado

Generar artefactos versionados para distribución interna:

- zip de Chrome;
- zip de Firefox previo a firma;
- zip de código fuente;
- notas de lanzamiento y guía de compilación.

### 3) Firma (Firefox privado)

Subir el zip de Firefox a AMO como `unlisted` para obtener el `.xpi` firmado.
Solo los paquetes firmados deben distribuirse a usuarios finales.

### 4) Publicación

Publicar en el host privado:

- archivo `.xpi` firmado,
- `updates.json` apuntando a la versión publicada.

Esta fase habilita autoactualizaciones del canal privado.

### 5) Verificación posterior al lanzamiento

Verificar:

- disponibilidad HTTP/HTTPS de `updates.json`;
- descarga del `.xpi` publicado;
- instalación/actualización en un entorno de prueba.

## Matriz de Comandos

Comandos principales del flujo:

```bash
# Compilación de desarrollo (chrome + firefox)
npm run build:dev -- --target all

# Compilación de producción (chrome + firefox autoalojado)
npm run build:prod -- --target all --firefox-update-url https://<host>/<path>/updates.json

# Preparación de lanzamiento (metadatos + artefactos)
npm run release:prepare

# Publicación de actualización privada de Firefox
npm run release:publish:firefox
```

Alias compatibles:

```bash
npm run update:prepare
npm run update:publish
```

## Variables de Entorno

Base recomendada: `.env.example`

Variables operativas:

- `FIREFOX_UPDATE_URL`: URL final de `updates.json` incrustada para Firefox autoalojado.
- `FIREFOX_UPDATES_BASE_URL`: URL base pública donde viven `updates.json` y `.xpi`.
- `UPDATE_REMOTE_SSH`: destino SSH (`usuario@host`) para publicación remota.
- `UPDATE_REMOTE_DIR`: directorio remoto de publicación.
- `UPDATE_SSH_KEY` (opcional): ruta de llave privada SSH.
- `UPDATE_SSH_PORT` (opcional): puerto SSH personalizado.

## Artefactos y Trazabilidad

Artefactos esperados en `dist/`:

- `wyac-chrome-vX.Y.Z.zip`
- `wyac-firefox-vX.Y.Z.zip`
- `wyac-source-vX.Y.Z.zip`
- `release-notes-vX.Y.Z.md`
- `BUILD_INSTRUCTIONS.md`

Trazabilidad mínima por lanzamiento:

- versión en `package.json` y `manifest.json`,
- entrada en historial de cambios,
- artefactos versionados consistentes.

## Controles de Seguridad y Riesgo

- Distribuir únicamente `.xpi` firmados por Mozilla.
- Servir `updates.json` y artefactos por HTTPS.
- Evitar credenciales codificadas en el código; usar variables de entorno.
- Mantener permisos mínimos en infraestructura de despliegue.

## Estrategia de Reversión

Si un lanzamiento falla:

1. restaurar `updates.json` a la última versión estable;
2. conservar historial de artefactos para reversión rápida;
3. registrar incidente y causa raíz antes de la siguiente publicación.

## Lista Operativa de Verificación

Lista breve previa a publicar:

- [ ] Calidad técnica validada (lint/pruebas/compilación).
- [ ] Versión e historial de cambios sincronizados.
- [ ] Artefactos generados correctamente.
- [ ] `.xpi` firmado disponible.
- [ ] `updates.json` y `.xpi` publicados por HTTPS.
- [ ] Verificación posterior al lanzamiento completada.

## Referencias

- [docs/BUILD_INSTRUCTIONS.md](../docs/BUILD_INSTRUCTIONS.md)
- https://extensionworkshop.com/documentation/manage/updating-your-extension/
- https://extensionworkshop.com/documentation/publish/signing-and-distribution-overview/
- https://extensionworkshop.com/documentation/publish/distribute-pre-release-versions/
- https://extensionworkshop.com/documentation/develop/build-a-secure-extension/
