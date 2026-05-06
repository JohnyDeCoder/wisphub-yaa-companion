<!-- Compatibilidad mejorada del enlace "volver arriba": ver https://github.com/othneildrew/Best-README-Template/pull/73 -->

<a id="readme-top"></a>

[![Bifurcaciones][forks-shield]][forks-url]
[![Estrellas][stars-shield]][stars-url]
[![Incidencias][issues-shield]][issues-url]
[![Licencia AGPL][license-shield]][license-url]
[![Versión][version-shield]][release-url]
[![Manifiesto V3][manifest-shield]][manifest-url]

<br />
<div align="center">
  <a href="https://github.com/JohnyDeCoder/wisphub-yaa-companion">
    <img src="docs/images/banner.jpg" alt="Banner Wisphub Yaa Companion" width="1400" height="560">
  </a>

  <h3 align="center">Wisphub Yaa Companion</h3>

  <p align="center">
    Extensión de navegador que acelera y simplifica las tareas del día a día dentro de WispHub.
    <br />
    <a href="https://github.com/JohnyDeCoder/wisphub-yaa-companion/issues">Reportar error</a>
    ·
    <a href="https://github.com/JohnyDeCoder/wisphub-yaa-companion/issues">Solicitar mejora</a>
  </p>
</div>

<details>
  <summary>Tabla de contenido</summary>
  <ol>
    <li><a href="#acerca-del-proyecto">Acerca del proyecto</a></li>
    <li><a href="#tecnologías">Tecnologías</a></li>
    <li>
      <a href="#primeros-pasos">Primeros pasos</a>
      <ul>
        <li><a href="#referencia-rápida">Referencia rápida</a></li>
      </ul>
    </li>
    <li>
      <a href="#funcionalidades">Funcionalidades</a>
      <ul>
        <li><a href="#-formateador-de-comentarios">Formateador de comentarios</a></li>
        <li><a href="#-calculadora-de-precios-y-prorrateo">Calculadora de precios y prorrateo</a></li>
        <li><a href="#-plantilla-rápida-de-instalación">Plantilla rápida de instalación</a></li>
        <li><a href="#-auto-rellenado-de-plantilla">Auto-rellenado de plantilla</a></li>
        <li><a href="#-calculadora-de-precios-en-panel-emergente">Calculadora de precios en panel emergente</a></li>
        <li><a href="#-gestión-masiva-de-tickets">Gestión masiva de tickets</a></li>
        <li><a href="#-copiado-rápido-de-ticket">Copiado rápido de ticket</a></li>
        <li><a href="#-gestión-masiva-de-instalaciones">Gestión masiva de instalaciones</a></li>
        <li><a href="#-copiado-rápido-de-instalación">Copiado rápido de instalación</a></li>
        <li><a href="#-enlaces-whatsapp-teléfonos">Enlaces WhatsApp (teléfonos)</a></li>
        <li><a href="#-coordenadas-y-google-maps">Coordenadas y Google Maps</a></li>
        <li><a href="#-botones-de-acción-rápida-en-clientes">Botones de acción rápida en clientes</a></li>
        <li><a href="#-botón-flotante-subir-archivos">Botón flotante "Subir Archivos"</a></li>
        <li><a href="#-reemplazo-de-avatar-por-defecto">Reemplazo de avatar por defecto</a></li>
        <li><a href="#-botón-ir-arriba">Botón "Ir arriba"</a></li>
        <li><a href="#-inyección-de-ids-de-staff">Inyección de IDs de staff</a></li>
        <li><a href="#-taller-de-utilidades">Taller de Utilidades</a></li>
        <li><a href="#-vista-rápida-de-clientes">Vista rápida de clientes</a></li>
        <li><a href="#-panel-emergente-panel-de-control">Panel emergente (panel de control)</a></li>
        <li><a href="#-notificaciones-en-página">Notificaciones en página</a></li>
      </ul>
    </li>
    <li><a href="#lanzamientos">Lanzamientos</a></li>
    <li><a href="#atajos-de-teclado">Atajos de teclado</a></li>
    <li><a href="#estructura-del-proyecto">Estructura del proyecto</a></li>
    <li><a href="#seguridad-y-permisos">Seguridad y permisos</a></li>
    <li><a href="#licencia">Licencia</a></li>
    <li><a href="#contacto">Contacto</a></li>
  </ol>
</details>

---

## Acerca del proyecto

**Wisphub Yaa Companion** es una extensión de productividad creada para uso interno en la plataforma [WispHub](https://wisphub.io), diseñada para el equipo de **Yaa Internet by VW**.

Su objetivo es simple: **reducir clics, automatizar tareas repetitivas y facilitar el trabajo diario** de los operadores, técnicos y administradores que usan WispHub para gestionar clientes, tickets, instalaciones y más.

**Compatibilidad:**

| Navegador | Soporte                                   |
| --------- | ----------------------------------------- |
| Chrome    | ✅                                        |
| Edge      | ✅                                        |
| Opera     | ✅                                        |
| Firefox   | ✅ (validar manualmente cada lanzamiento) |

> Funciona en ambos dominios: `wisphub.io` (antenas) y `wisphub.app` (fibra óptica).

<p align="right">(<a href="#readme-top">ir arriba</a>)</p>

---

## Tecnologías

| Tecnología              | Uso                                                          |
| ----------------------- | ------------------------------------------------------------ |
| JavaScript (ES Modules) | Lenguaje principal, sin frameworks externos                  |
| Webpack 5               | Empaquetado y compilación del código                         |
| Manifiesto V3           | Formato moderno de extensiones de navegador                  |
| CKEditor                | Editor de texto enriquecido de WispHub (integración directa) |
| ESLint                  | Linting y calidad de código                                  |
| Vitest (Node + JSDOM)   | Pruebas unitarias y de regresión                             |

<p align="right">(<a href="#readme-top">ir arriba</a>)</p>

---

## Primeros pasos

### Referencia rápida

- Requisitos: `Node.js >= 18` y `npm >= 9`.
- Dependencias: `npm install`.
- Validación recomendada:

  ```sh
  npm run check
  ```

- Compilación de producción:

  ```sh
  npm run build
  npm run build:firefox
  ```

- Desarrollo:

  ```sh
  npm run dev
  npm run dev:firefox
  ```

- Carga local:
  - Chrome / Edge / Opera: `chrome://extensions`
  - Firefox: `about:debugging`

<p align="right">(<a href="#readme-top">ir arriba</a>)</p>

---

## Lanzamientos

El proyecto incluye un conjunto pequeño de comandos para versionado, validación y empaquetado.

**Resumen**

- Flujo recomendado de Firefox privado: `npm run build:dev`, `npm run build:prod`, `npm run release:prepare` y `npm run release:publish:firefox`.
- Ya está soportada la publicación privada de Firefox mediante `.xpi` firmado + `updates.json` autoalojado.
- `build:dev` genera salida de desarrollo (Firefox por defecto).
- `build:prod` ejecuta lint y genera paquetes de producción (Chrome + Firefox autoalojado).
- `check` ejecuta validación completa (`lint + tests + build + build:firefox`).
- `release:prepare` cubre versionado opcional, documentación derivada y artefactos.
- `release:publish:firefox` cubre `updates.json` + publicación remota del `.xpi` firmado.
- Alias compatibles: `update:prepare` y `update:publish`.
- Variables operativas: ver `.env.example`.

**Referencia**

- Uso de scripts: [scripts/README.md](scripts/README.md)

**Ayuda externa**

- https://extensionworkshop.com/documentation/manage/updating-your-extension/
- https://extensionworkshop.com/documentation/publish/signing-and-distribution-overview/
- https://extensionworkshop.com/documentation/publish/distribute-pre-release-versions/
- https://extensionworkshop.com/documentation/develop/build-a-secure-extension/
- https://extensionworkshop.com/documentation/develop/web-ext-command-reference/

<p align="right">(<a href="#readme-top">ir arriba</a>)</p>

---

## Funcionalidades

### 📝 Formateador de comentarios

**Dónde funciona:** Páginas de edición de instalaciones, preinstalaciones y clientes — cualquier página que tenga el editor de texto (CKEditor).

**Qué hace:** Toma el texto del editor y lo reorganiza automáticamente: aplica negritas donde corresponde, convierte a mayúsculas los títulos, agrega saltos de línea y deja una estructura uniforme. También incluye restauración del contenido original.

**Puntos de entrada:**

- Botón en la barra del editor (aparece junto a los botones de CKEditor).
- Acceso por teclado: `Ctrl+Shift+F`.
- Integración con el panel emergente de la extensión.

**Extras:**

- **Auto-formato al cargar:** Cuando la opción está habilitada en ajustes, el comentario se formatea al abrir la página.
- **Auto-llenado de campos:** Al formatear, la extensión detecta datos como datos fiscales, costo de instalación y técnico, y los rellena automáticamente en los campos del formulario de WispHub.
- **Limpieza de datos fiscales:** Si los datos fiscales ya están en los campos del formulario, se eliminan del comentario para no repetir la información.
- **Forma de contratación automática en pre-instalación:** Si el comentario contiene `--- HECHO CON EL FORMULARIO DE PRE-INSTALACIÓN` y está activo el ajuste **Auto-rellenar campos**, la extensión selecciona `Página Internet` en `Forma de contratación` (solo si el campo está vacío).
- **Validaciones antes de guardar:** En páginas de instalación/preinstalación/clientes del flujo soportado, se muestran confirmaciones preventivas cuando:
  - el costo de instalación coincide con el precio del plan/paquete,
  - el precio detectado en `PAQUETE/PLAN` no coincide con el `Plan internet` seleccionado,
  - el costo de instalación es menor al precio del plan/paquete (para evitar capturas accidentales; permite continuar si fue descuento).
  - Si el formulario tiene errores visibles de WispHub (`has-error`, `aria-invalid`, etc.), estas confirmaciones no se muestran hasta corregirlos.

<p align="right">(<a href="#readme-top">ir arriba</a>)</p>

### 🧮 Calculadora de precios y prorrateo

**Dónde funciona:** Páginas de edición de instalaciones y preinstalaciones.

**Qué hace:** Calcula automáticamente el precio que corresponde al cliente, incluyendo el **prorrateo** según los días restantes del mes.

**Comportamiento:**

- Lee la **fecha de instalación** del formulario.
- Toma el **precio del paquete** del plan seleccionado o del texto del comentario.
- Calcula cuántos días quedan del mes y el prorrateo correspondiente.
- Actualiza la línea de precios en el comentario (ej: `EQUIPO PRESTADO $1,000 + RESTANTE DE MES FEBRERO $225 = $1,225 MXN`).

**Puntos de entrada:**

- Botón "Calcular" en la barra del editor.
- Acceso por teclado: `Ctrl+Shift+Alt+P`.
- **Se recalcula solo** al cambiar la fecha de instalación (si la opción está activada en ajustes).

> Si la línea de precios aún no está completa (por ejemplo `EQUIPO PRESTADO $ + RESTANTE DE MES $ = $`), la extensión la completa automáticamente con los valores correctos.
>
> Si el costo de instalación es `0`, la línea se normaliza como **`CORTESÍA`** (manteniendo valor numérico interno de `0` para cálculos).

<p align="right">(<a href="#readme-top">ir arriba</a>)</p>

### 📋 Plantilla rápida de instalación

**Dónde funciona:** Páginas de edición de instalaciones y preinstalaciones.

**Qué hace:** Genera una **plantilla lista para pegar** con la estructura habitual de un comentario de instalación nueva: tipo de equipo, línea de precios con el mes actual, horario, forma de pago, técnico y asesor.

**Interacción:** Se activa desde el botón "Plantilla" de la barra del editor y deja el contenido listo en el portapapeles para pegarlo en el comentario.

<p align="right">(<a href="#readme-top">ir arriba</a>)</p>

### 📄 Auto-rellenado de plantilla

**Dónde funciona:** Páginas de edición/creación de instalaciones, preinstalaciones, solicitar instalación y agregar clientes.

**Qué hace:** Si el editor de comentarios está **vacío**, la extensión inserta automáticamente la plantilla de instalación completa, ya formateada y con los precios calculados cuando los datos del formulario están disponibles. Si no hay datos de paquete o fecha, inserta la plantilla en blanco con el mes correspondiente.

**Activación:** Depende del ajuste "Auto-rellenar plantilla" del panel emergente. Se integra con el auto-formato y con la activación manual del formateador.

<p align="right">(<a href="#readme-top">ir arriba</a>)</p>

### 🔢 Calculadora de precios en panel emergente

**Dónde funciona:** Desde el panel emergente de la extensión (disponible en cualquier página).

**Qué hace:** Permite calcular manualmente el precio de una instalación con prorrateo sin depender de una página con editor. Usa la misma lógica del calculador integrado y conserva los valores entre aperturas del panel emergente.

**Interacción:**

- Se expone desde la tarjeta **"Calculadora de precios"** del panel emergente.
- Admite precio de instalación, precio mensual y fecha.
- Genera una línea calculada que puede copiarse al portapapeles.
- La acción **Limpiar** reinicia los valores cargados.

> Los valores persisten entre sesiones del panel emergente. La calculadora siempre está disponible, incluso fuera de WispHub.

<p align="right">(<a href="#readme-top">ir arriba</a>)</p>

### 🎫 Gestión masiva de tickets

**Dónde funciona:** Listas de tickets (`/tickets/`, `/tickets/1/`, `/tickets/2/`, etc.).

**Qué hace:** Agrega una nueva opción al menú de acciones masivas que permite **cambiar varios tickets a "Nuevos" al mismo tiempo**. Complementa la operación masiva nativa de WispHub con una transición inversa hacia el estado "Nuevo".

**Interacción:**

- Opera sobre tickets seleccionados desde las casillas de verificación.
- Se expone como una opción adicional dentro del menú de acciones masivas.
- La ejecución requiere confirmación antes de aplicar los cambios.

> La tabla se configura automáticamente para mostrar **500 registros por página**, así no tienes que cambiar la paginación manualmente.

<p align="right">(<a href="#readme-top">ir arriba</a>)</p>

### 📎 Copiado rápido de ticket

**Dónde funciona:** Listas de tickets.

**Qué hace:** Agrega un **botón de copiado** en la columna de acciones de cada fila de ticket. El texto copiado usa el formato:

```
Barrio/Localidad - Cliente - Asunto
```

**Resolución de columnas:** La extensión busca cada columna por su **nombre** en el encabezado de la tabla, no por la posición. Esto permite que funcione aunque el orden cambie o algunas columnas estén ocultas.

> Del asunto solo se copia la primera parte (antes del guion), para que el texto quede limpio.

<p align="right">(<a href="#readme-top">ir arriba</a>)</p>

### 🔧 Gestión masiva de instalaciones

**Dónde funciona:** Lista de instalaciones (`/Instalaciones/`).

**Qué hace:** Agrega un botón que busca todas las instalaciones con estado **"En Progreso"** y las cambia a **"Nueva"** de forma masiva. Muy útil cuando hay muchas instalaciones pendientes de reasignar.

**Comportamiento interno:** La extensión abre el formulario de edición de cada instalación en segundo plano, cambia el estado a "Nueva" y envía el formulario de forma automatizada sobre cada fila aplicable.

> La tabla se configura para **mostrar todos los registros** automáticamente al cargar la página.

<p align="right">(<a href="#readme-top">ir arriba</a>)</p>

### 🔧 Copiado rápido de instalación

**Dónde funciona:** Lista de instalaciones (`/Instalaciones/`).

**Qué hace:** Agrega un **botón de copiado** en la columna de acciones de cada fila de instalación. El texto copiado usa el formato:

```
Barrio/Localidad - Nombre del Cliente - Inst. Antena
```

El tipo de instalación cambia automáticamente según el dominio:

- En `wisphub.io` → **Inst. Antena**
- En `wisphub.app` → **Inst. Fibra**

Al igual que en los tickets, la extensión busca las columnas por su nombre, no por posición. Funciona aunque las columnas estén ocultas o en diferente orden.

<p align="right">(<a href="#readme-top">ir arriba</a>)</p>

### 📱 Enlaces WhatsApp (teléfonos)

**Dónde funciona:** Lista de clientes (`/clientes/`), lista de instalaciones (`/Instalaciones/`) y lista de preinstalaciones (`/preinstalaciones/`).

**Qué hace:** Convierte cada número de teléfono en la tabla en un **enlace directo a WhatsApp**. Si hay varios teléfonos separados por comas, cada uno se transforma de forma independiente.

**Interacción:**

- **Clic** en un teléfono → abre WhatsApp.
- **Ctrl+Clic** en un teléfono → copia el número al portapapeles.

**Detalles:**

- Agrega automáticamente el código de país de México (+52) a números de 10 dígitos.
- Ignora direcciones IP que podrían confundirse con teléfonos.
- Encuentra la columna de teléfono por el nombre del encabezado ("Teléfono", "Celular", etc.) o analizando el contenido de las celdas.
- Funciona también en filas expandidas (modo responsivo) cuando la columna de teléfono está oculta.

<p align="right">(<a href="#readme-top">ir arriba</a>)</p>

### 🗺️ Coordenadas y Google Maps

**Dónde funciona:** Cualquier página de WispHub que tenga el campo `#id_cliente-coordenadas` (bloque `Coordenadas`), lista de clientes (`/clientes/`), lista de instalaciones (`/Instalaciones/`) y lista de preinstalaciones (`/preinstalaciones/`).

**Qué hace:**

- Agrega un botón con icono (sin texto) junto al campo `Coordenadas` para abrir Google Maps directo al punto detectado.
- Si el campo contiene una URL de Google Maps (incluyendo `maps.app.goo.gl`), la conserva tal cual; no reescribe enlaces durante el formateo/auto-formateo.
- Si el campo contiene un enlace corto (`maps.app.goo.gl`) sin coordenadas explícitas, el botón abre ese enlace directamente.
- En la lista de clientes, convierte valores de `Coordenadas` en enlace directo de mapa y agrega icono de apertura externa.
- El botón de acción de mapa en tablas usa solo fuentes válidas de ubicación para evitar falsos positivos por montos como `$1,020`.
- En instalaciones y preinstalaciones, la prioridad de búsqueda de ubicación para el botón es: **Dirección -> Comentarios** (si no hay datos válidos, no se agrega el botón de mapa).

**Compatibilidad de columnas ocultas en `/clientes/`:**

- Cuando la columna `Coordenadas` existe pero está oculta, la extensión intenta leer el dato para habilitar el botón de mapa en acciones.
- Si la tabla no incluye ese dato en absoluto, no se puede construir el enlace automáticamente para esa fila.

<p align="right">(<a href="#readme-top">ir arriba</a>)</p>

### ⚡ Botones de acción rápida en clientes

**Dónde funciona:** Lista de clientes (`/clientes/`), instalaciones (`/Instalaciones/`) y preinstalaciones (`/preinstalaciones/`).

**Qué hace:** Agrega botones extra en la columna de acciones de cada fila:

- **Ver cliente** → acceso directo al perfil del cliente (solo en `/clientes/`).
- **Ver archivos** → acceso directo a la pestaña de archivos del cliente.
- **Ver ubicación en Google Maps** → acceso directo al mapa cuando hay coordenadas detectables.
- **Copiar plantilla de aprovisionamiento** → genera y copia en un clic una plantilla multilinea para operación:

  ```text
  MIGRACION|CLIENTE NUEVO
  NOMBRE_CLIENTE
  ID_SERVICIO
  SERVICE_PASSWORD
  ROUTER
  LOCALIDAD
  IP
  ESTADO
  PLAN
  EQUIPOS ...
  ```

  Si faltan datos clave, usa placeholders automáticos:
  - `SERVICE_PASSWORD` → `{{POR LLENAR / PASSWORD HOTSPOT }}`
  - línea de equipos → `{{POR LLENAR / EQUIPOS }}`
  - cuando sí detecta una línea de equipos con importes, recorta el texto y deja solo el tipo (`EQUIPO COMODATO`, `EQUIPO COMPRADO`, `EQUIPOS PRESTADOS`, etc.).
  - al copiar, si la plantilla queda con datos pendientes, muestra una notificación `warning` con los campos faltantes para evitar omisiones operativas.

- **Copiar nombre para aprovisionamiento** (icono junto al nombre del cliente):
  - Clic normal: copia con formato por defecto `MAYÚSCULAS + "_"` (ej. `FEDRA_ALEJANDRA_MARTINEZ_CRUZ`).
  - `Ctrl+Clic`: abre configuración rápida para cambiar el formato (`upper/lower/title`) y el separador entre palabras.
  - La configuración se guarda para siguientes copias.

- **Diagnóstico Express (BETA)** (en `/clientes/ver/...`):
  - Ejecuta una secuencia rápida por cliente: `Ping`, `Torch`, `Tráfico semanal` y `Estado de cuenta`.
  - Abre un modal de diagnóstico con progreso visual por etapa, estado tipo semáforo y una sección de detalles al finalizar.
  - Permite copiar el resultado completo con formato multilinea y también **re-ejecutar** desde el mismo modal.
  - En el encabezado del cliente agrega accesos directos de una acción a: `Ping`, `Torch` y `Tráfico semanal` (abren en nueva pestaña).
  - Cada tarjeta del bloque **Detalles** incluye un botón ghost de ayuda con popover (click) para explicar, de forma breve y específica, qué representa cada dato.
  - En el subtítulo del modal prioriza el **nombre completo del cliente** cuando está disponible.
  - En el resumen copiado incluye enlaces rápidos en URL absoluta (con dominio completo) y muestras de `Ping` (hasta 4 registros).
  - Añade interpretación explícita cuando `Torch` o `Tráfico semanal` responden sin consumo/flujo detectado.
  - Si una o más etapas fallan, entrega resultado `PARCIAL` o `ERROR` y mantiene el resumen con los datos disponibles.
  - Si el servicio está `Cancelado`, `Suspendido`, `Desactivado`, etc., se clasifica con alerta y evita falsos `COMPLETO`.
  - Clasifica errores comunes con mensajes claros (`401`, `403`, timeout, parseo incompleto, task failure).
  - Si el diagnóstico no puede iniciar (por ejemplo, porque ya hay uno en curso), el popup muestra el error real y no se cierra como si hubiera iniciado.
  - Si cierras el modal durante la ejecución, se cancela el flujo pendiente.
  - En la vista de detalle del cliente (`/clientes/ver/...`) agrega un botón de cabecera: **Ejecutar diagnóstico express** (BETA).
  - En la lista de clientes no agrega botón de diagnóstico para evitar confusión visual con otras acciones.
  - Limitación conocida: depende de endpoints internos de sesión y estructura HTML de WispHub; ante cambios de plataforma puede degradar a resultado parcial.

Aparecen junto a los botones de acción que ya tiene WispHub, con separador e iconos propios.

<p align="right">(<a href="#readme-top">ir arriba</a>)</p>

### 📤 Botón flotante "Subir Archivos"

**Dónde funciona:** Página de detalle de un cliente (`/clientes/ver/...`).

**Qué hace:** Muestra un **botón flotante** con acceso directo a la pestaña "Subir Archivos" del cliente.

<p align="right">(<a href="#readme-top">ir arriba</a>)</p>

### 🖼️ Reemplazo de avatar por defecto

**Dónde funciona:** Todas las páginas de WispHub.

**Qué hace:** Detecta la imagen de avatar genérica de WispHub (la que aparece cuando no has subido foto) y la **reemplaza por el avatar personalizado** de la extensión. Funciona en la barra lateral, en el panel y en cualquier lugar donde aparezca el avatar.

> Detecta variantes como `avatar.thumbnail.png`, `avatar_default.jpg`, etc., y observa cambios en la página para reemplazar avatares que se carguen después.

<p align="right">(<a href="#readme-top">ir arriba</a>)</p>

### ⬆️ Botón "Ir arriba"

**Dónde funciona:** Todas las páginas de WispHub.

**Qué hace:** Agrega un **botón flotante** en la esquina inferior que permite volver suavemente al inicio de la página. Se oculta cuando la vista ya está en la parte superior.

<p align="right">(<a href="#readme-top">ir arriba</a>)</p>

### 🆔 Inyección de IDs de staff

**Dónde funciona:** Página de staff (`/staff/`).

**Qué hace:** Agrega una **columna "ID"** al inicio de la tabla de personal, mostrando el número de ID de cada miembro del equipo. Este ID se obtiene de la API de WispHub.

> Requiere una clave API configurada en los ajustes del panel emergente.

<p align="right">(<a href="#readme-top">ir arriba</a>)</p>

### 🛠️ Taller de Utilidades

**Dónde funciona:** Panel emergente (siempre disponible).

**Qué hace:** Abre un overlay lateral con tres herramientas de uso rápido para el día a día:

- **Convertidor de texto:** Escribe o pega texto y conviértelo a mayúsculas, minúsculas o formato título. Puedes combinar la conversión con la opción de eliminar acentos y/o limpiar espacios extra antes de copiar el resultado.
- **Generador de contraseñas:** Genera contraseñas seguras entre 6 y 16 caracteres eligiendo la combinación de letras, números y símbolos que necesites.
- **Limpiador de texto:** Elimina caracteres de control, saltos de línea múltiples y espacios innecesarios de cualquier texto pegado.

> El Taller recuerda qué sección dejaste abierta entre usos dentro de la misma sesión del popup.

<p align="right">(<a href="#readme-top">ir arriba</a>)</p>

### 👁️ Vista rápida de clientes

**Dónde funciona:** Lista de clientes (`/clientes/`).

**Qué hace:** Al pasar el cursor sobre una fila de cliente, muestra un **popup contextual** con información clave sin necesidad de abrir el perfil completo:

- **Saldo y estado de cuenta** (al corriente, con deuda, sin datos).
- **Plan de internet** contratado.
- **Tickets en progreso** con enlace directo a cada ticket.
- **Tickets pendientes** con enlace directo a cada ticket.
- **Último movimiento de bitácora del mes:** acción registrada, estado, asesor responsable, fecha y hora.
- **Accesos directos** al perfil del cliente, sección de pagos y bitácora en una sola pestaña.

> Se puede activar/desactivar y configurar el tiempo de demora antes de mostrar el popup desde los ajustes del panel emergente. Requiere API Key configurada para obtener saldo y tickets.

<p align="right">(<a href="#readme-top">ir arriba</a>)</p>

### ⚙️ Panel emergente (panel de control)

El icono de la extensión en la barra del navegador abre un **panel de control** con estas secciones:

- **Estado de conexión:** Muestra si estás en WispHub y si el editor está disponible.
- **Info de sesión:** Nombre de usuario detectado en la página, ID de staff (si hay API Key), badge de advertencia cuando faltan API Keys y acceso directo a Configuración avanzada.
- **Switch de perfil (Colima/Michoacán):** Botón en la tarjeta de sesión para cambiar rápidamente entre perfiles del dominio actual (`wisphub.io` o `wisphub.app`). Reutiliza cookies guardadas cuando vuelves a un perfil ya conocido y, si hace falta login asistido, permite entrar con cualquier cuenta del dominio destino sin exigir el mismo usuario antes del `@`.
  - La vigencia de la sesión guardada se renueva aunque las cookies no cambien, para reducir cambios innecesarios a login asistido.
- **Formateador:** Botón para formatear o restaurar el comentario desde el panel emergente.
- **Calculadora:** Calculadora independiente de precios con prorrateo (siempre disponible, sin necesidad de editor ni dominio específico).
- **Diagnóstico Express (BETA):** Tarjeta contextual que se habilita al seleccionar un cliente en `/clientes/` o al abrir su detalle; inicia el diagnóstico y muestra el resultado en modal dentro de la página.
- **Utilidades:** Sección con herramientas rápidas para el día a día, como convertidor de texto, generador de contraseñas y limpieza de texto.
- **Vista rápida de clientes:** Ajuste opcional para mostrar un popup contextual al pasar el cursor sobre clientes en `/clientes/`, con tickets activos, saldo, último log disponible y accesos directos al perfil, pagos y log.
- **Ajustes:**
  - Activar/desactivar notificaciones en página.
  - Activar/desactivar auto-formato al cargar.
  - Activar/desactivar auto-cálculo de precios al cargar.
  - Activar/desactivar auto-rellenado de plantilla en editor vacío.
  - Guardar API Keys para `wisphub.io` y `wisphub.app`.
- **Registros:** Bitácora diaria de acciones y cambios relevantes de la extensión, con hora local en formato de 12 horas y detalles antes/después cuando aplica.
- **Historial de cambios:** Lista de cambios por versión.

<p align="right">(<a href="#readme-top">ir arriba</a>)</p>

### 🔔 Notificaciones en página

**Dónde funciona:** Todas las páginas donde la extensión hace algo.

**Qué hace:** Muestra mensajes temporales (éxito, advertencia, error, info) cuando la extensión completa una acción. Las notificaciones desaparecen solas y se pueden apilar si hay varias al mismo tiempo.

> Se pueden desactivar desde los ajustes del panel emergente.

<p align="right">(<a href="#readme-top">ir arriba</a>)</p>

---

## Atajos de teclado

| Atajo              | Acción                           |
| ------------------ | -------------------------------- |
| `Ctrl+Shift+F`     | Formatear / restaurar comentario |
| `Ctrl+Shift+Alt+P` | Recalcular precios               |

<p align="right">(<a href="#readme-top">ir arriba</a>)</p>

---

## Estructura del proyecto

```text
wisphub-yaa-companion/
├── src/
│   ├── config/              # Constantes, dominios permitidos, mensajes
│   ├── utils/               # Herramientas reutilizables (logger, polling, tooltips, DOM)
│   ├── lib/                 # Capas intermedias (editor CKEditor, mensajería, storage)
│   ├── features/            # Funcionalidades (cada una independiente)
│   │   ├── formatter/       #   └── Formateador de comentarios
│   │   ├── price-calculator/#   └── Calculadora de precios y prorrateo
│   │   ├── template/        #   └── Plantilla rápida de instalación
│   │   ├── tickets/         #   └── Gestión masiva + copiado de tickets
│   │   ├── installations/   #   └── Gestión masiva + copiado de instalaciones
│   │   ├── clients/         #   └── WhatsApp, botones de acción, subir archivos
│   │   ├── navigation/      #   └── Avatar personalizado, botón ir arriba
│   │   └── staff/           #   └── API de staff e inyección de IDs
│   ├── styles/              # CSS (variables + estilos inyectados en la página)
│   └── app/                 # Puntos de entrada
│       ├── page.js          #   └── Script principal (acceso directo al editor)
│       ├── content.js       #   └── Puente de mensajes, staff, avatar
│       ├── background.js    #   └── Trabajador de servicio (API, caché, iconos)
│       ├── popup/           #   └── Panel de control (HTML, CSS, JS, historial de cambios)
│       └── pages/           #   └── Páginas estáticas (novedades)
├── scripts/                 # Utilidades de compilación, release y publicación privada de Firefox
├── tests/                   # Pruebas unitarias y de regresión (Vitest + JSDOM)
├── assets/                  # Iconos y recursos estáticos
├── manifest.json            # Configuración de la extensión (Manifiesto V3)
├── webpack.config.js        # Configuración de Webpack (Chrome + Firefox)
└── package.json             # Dependencias y scripts npm
```

**Flujo de datos simplificado:**

```text
config → utils → lib → features → app (page.js / content.js / background.js)
```

<p align="right">(<a href="#readme-top">ir arriba</a>)</p>

---

## Seguridad y permisos

| Aspecto               | Detalle                                                                                                    |
| --------------------- | ---------------------------------------------------------------------------------------------------------- |
| **Permisos**          | `storage` y `cookies` (ajustes/caché local + cambio de sesión asistido)                                    |
| **Dominios**          | Restringido a `*.wisphub.io` y `*.wisphub.app`                                                             |
| **Código remoto**     | No se usa `eval`, `Function()` ni scripts externos                                                         |
| **API Keys**          | Se guardan localmente en el navegador, nunca salen a terceros                                              |
| **Cookies de sesión** | Snapshot local por perfil (máx. 8 perfiles, máx. 20 cookies por perfil, TTL 24h, sin cookies de analytics) |
| **Datos**             | No se recopilan datos personales ni se envía telemetría                                                    |

Para más detalles, consulta la [Política de Privacidad](PRIVACY_POLICY.md).

<p align="right">(<a href="#readme-top">ir arriba</a>)</p>

---

## Licencia

Distribuido bajo la licencia **GNU Affero General Public License v3.0** (AGPL-3.0-or-later).
Consulta el archivo [LICENSE](LICENSE) para el texto completo.

<p align="right">(<a href="#readme-top">ir arriba</a>)</p>

---

## Contacto

**Proyecto:** [github.com/JohnyDeCoder/wisphub-yaa-companion](https://github.com/JohnyDeCoder/wisphub-yaa-companion)

**Autor:** [JohnyDeCoder](https://github.com/JohnyDeCoder)

**Contacto:** johny.m@yaainternet.com

<p align="right">(<a href="#readme-top">ir arriba</a>)</p>

<!-- MARKDOWN LINKS & IMAGES -->

[contributors-shield]: https://img.shields.io/github/contributors/JohnyDeCoder/wisphub-yaa-companion.svg?style=for-the-badge
[contributors-url]: https://github.com/JohnyDeCoder/wisphub-yaa-companion/graphs/contributors
[forks-shield]: https://img.shields.io/github/forks/JohnyDeCoder/wisphub-yaa-companion.svg?style=for-the-badge
[forks-url]: https://github.com/JohnyDeCoder/wisphub-yaa-companion/network/members
[stars-shield]: https://img.shields.io/github/stars/JohnyDeCoder/wisphub-yaa-companion.svg?style=for-the-badge
[stars-url]: https://github.com/JohnyDeCoder/wisphub-yaa-companion/stargazers
[issues-shield]: https://img.shields.io/github/issues/JohnyDeCoder/wisphub-yaa-companion.svg?style=for-the-badge
[issues-url]: https://github.com/JohnyDeCoder/wisphub-yaa-companion/issues
[license-shield]: https://img.shields.io/github/license/JohnyDeCoder/wisphub-yaa-companion.svg?style=for-the-badge
[license-url]: https://github.com/JohnyDeCoder/wisphub-yaa-companion/blob/master/LICENSE
[version-shield]: https://img.shields.io/badge/version-1.5.0-blue?style=for-the-badge
[release-url]: https://github.com/JohnyDeCoder/wisphub-yaa-companion/releases
[manifest-shield]: https://img.shields.io/badge/manifest-v3-orange?style=for-the-badge
[manifest-url]: https://developer.chrome.com/docs/extensions/mv3/intro/
