# Plantilla de Solicitud de Cambios

## Resumen

Describe claramente qué cambia, por qué cambia y qué problema resuelve.

## Incidencia Vinculada

Cierra # (incidencia)

## Tipo de Cambio

- [ ] `feat` funcionalidad nueva
- [ ] `fix` corrección de error
- [ ] `refactor` cambio interno sin efecto funcional
- [ ] `docs` documentación
- [ ] `chore/ci/build` mantenimiento de automatización
- [ ] `breaking` cambio incompatible

## Alcance

- Módulos tocados:
- Riesgos identificados:
- Compatibilidad de navegador validada:

## Validación

Incluye comandos ejecutados y resultado.

```bash
npm run lint
# opcional según alcance
npm run check
```

## Impacto en UI/UX (si aplica)

- [ ] Cambia textos visibles para usuario.
- [ ] Cambia flujos del panel emergente o acciones en página.
- [ ] Requiere actualización de capturas o docs.

## Lista de Verificación de Calidad

- [ ] El título del PR cumple Commits Convencionales (`type(scope): descripcion`, en inglés).
- [ ] Se respetó la arquitectura (`config -> utils -> lib -> features -> app`).
- [ ] Los mensajes UI reutilizables se centralizaron en `src/config/messages.js` cuando aplica.
- [ ] Todo cambio funcional incluye pruebas automatizadas nuevas o ajustadas.
- [ ] Toda funcionalidad nueva visible para usuario está documentada en `README.md` (sección `Funcionalidades`).
- [ ] No quedan registros de depuración, código muerto ni comentarios redundantes.
- [ ] Se actualizó documentación relacionada.
