<!-- Improved compatibility of back to top link: See: https://github.com/othneildrew/Best-README-Template/pull/73 -->

<a id="readme-top"></a>

[![Forks][forks-shield]][forks-url]
[![Stargazers][stars-shield]][stars-url]
[![Issues][issues-shield]][issues-url]
[![AGPL License][license-shield]][license-url]
[![Version][version-shield]][release-url]
[![Manifest V3][manifest-shield]][manifest-url]

<br />
<div align="center">
  <a href="https://github.com/JohnyDeCoder/wisphub-yaa-companion">
    <img src="docs/images/banner.jpg" alt="Banner Wisphub Yaa Companion" width="1400" height="560">
  </a>

  <h3 align="center">Wisphub Yaa Companion</h3>

  <p align="center">
    Extensión de navegador que acelera y simplifica las tareas del día a día dentro de WispHub.
    <br />
    <a href="https://github.com/JohnyDeCoder/wisphub-yaa-companion/issues">Reportar bug</a>
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
        <li><a href="#requisitos">Requisitos</a></li>
        <li><a href="#instalación">Instalación</a></li>
      </ul>
    </li>
    <li>
      <a href="#funcionalidades">Funcionalidades</a>
      <ul>
        <li><a href="#-formateador-de-comentarios">Formateador de comentarios</a></li>
        <li><a href="#-calculadora-de-precios-y-prorrateo">Calculadora de precios y prorrateo</a></li>
        <li><a href="#-plantilla-rápida-de-instalación">Plantilla rápida de instalación</a></li>
        <li><a href="#-auto-rellenado-de-plantilla">Auto-rellenado de plantilla</a></li>
        <li><a href="#-calculadora-de-precios-en-popup">Calculadora de precios en popup</a></li>
        <li><a href="#-gestión-masiva-de-tickets">Gestión masiva de tickets</a></li>
        <li><a href="#-copiado-rápido-de-ticket">Copiado rápido de ticket</a></li>
        <li><a href="#-gestión-masiva-de-instalaciones">Gestión masiva de instalaciones</a></li>
        <li><a href="#-copiado-rápido-de-instalación">Copiado rápido de instalación</a></li>
        <li><a href="#-enlaces-whatsapp-teléfonos">Enlaces WhatsApp (teléfonos)</a></li>
        <li><a href="#-botones-de-acción-rápida-en-clientes">Botones de acción rápida en clientes</a></li>
        <li><a href="#-botón-flotante-subir-archivos">Botón flotante "Subir Archivos"</a></li>
        <li><a href="#-reemplazo-de-avatar-por-defecto">Reemplazo de avatar por defecto</a></li>
        <li><a href="#-botón-ir-arriba">Botón "Ir arriba"</a></li>
        <li><a href="#-inyección-de-ids-de-staff">Inyección de IDs de staff</a></li>
        <li><a href="#-popup-panel-de-control">Popup (panel de control)</a></li>
        <li><a href="#-notificaciones-en-página">Notificaciones en página</a></li>
      </ul>
    </li>
    <li><a href="#atajos-de-teclado">Atajos de teclado</a></li>
    <li><a href="#estructura-del-proyecto">Estructura del proyecto</a></li>
    <li><a href="#roadmap">Roadmap</a></li>
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

| Navegador | Soporte                               |
| --------- | ------------------------------------- |
| Chrome    | ✅                                    |
| Edge      | ✅                                    |
| Opera     | ✅                                    |
| Firefox   | ✅ (validar manualmente cada release) |

> Funciona en ambos dominios: `wisphub.io` (antenas) y `wisphub.app` (fibra óptica).

<p align="right">(<a href="#readme-top">ir arriba</a>)</p>

---

## Tecnologías

| Tecnología              | Uso                                                          |
| ----------------------- | ------------------------------------------------------------ |
| JavaScript (ES Modules) | Lenguaje principal, sin frameworks externos                  |
| Webpack 5               | Empaquetado y compilación del código                         |
| Manifest V3             | Formato moderno de extensiones de navegador                  |
| CKEditor                | Editor de texto enriquecido de WispHub (integración directa) |
| ESLint                  | Linting y calidad de código                                  |

<p align="right">(<a href="#readme-top">ir arriba</a>)</p>

---

## Primeros pasos

### Requisitos

- **Node.js** >= 18
- **npm** >= 9

### Instalación

1. **Clonar** el repositorio:

   ```sh
   git clone https://github.com/JohnyDeCoder/wisphub-yaa-companion.git
   ```

2. **Instalar** dependencias:

   ```sh
   npm install
   ```

3. **Compilar** para producción:

   ```sh
   npm run build          # Chrome / Edge / Opera
   npm run build:firefox  # Firefox
   ```

4. **Cargar** la carpeta `dist/chrome/` (o `dist/firefox/`) como extensión en tu navegador:
   - **Chrome / Edge / Opera**: ve a `chrome://extensions` → activa "Modo desarrollador" → "Cargar extensión descomprimida" → selecciona la carpeta.
   - **Firefox**: ve a `about:debugging` → "Este Firefox" → "Cargar complemento temporal" → selecciona `manifest.json`.

5. **Desarrollo** (recompila automáticamente al guardar cambios):

   ```sh
   npm run dev            # Chrome
   npm run dev:firefox    # Firefox
   ```

<p align="right">(<a href="#readme-top">ir arriba</a>)</p>

---

## Funcionalidades

### 📝 Formateador de comentarios

**Dónde funciona:** Páginas de edición de instalaciones, preinstalaciones y clientes — cualquier página que tenga el editor de texto (CKEditor).

**Qué hace:** Toma el texto que escribiste en el editor y lo organiza automáticamente: le pone negritas donde corresponde, convierte a mayúsculas los títulos, agrega saltos de línea y deja todo con una estructura limpia y uniforme. Si te equivocaste o no te gusta el resultado, puedes **restaurar** el texto original con un clic.

**Cómo se usa:**

- Botón en la barra del editor (aparece junto a los botones de CKEditor).
- Atajo rápido: `Ctrl+Shift+F`.
- Desde el popup de la extensión (botón "Usar" / "Restaurar").

**Extras:**

- **Auto-formato al cargar:** Si activas esta opción en los ajustes, el comentario se formatea solo al abrir la página, sin que tengas que hacer nada.
- **Auto-llenado de campos:** Al formatear, la extensión detecta datos como datos fiscales, costo de instalación y técnico, y los rellena automáticamente en los campos del formulario de WispHub.
- **Limpieza de datos fiscales:** Si los datos fiscales ya están en los campos del formulario, se eliminan del comentario para no repetir la información.

<p align="right">(<a href="#readme-top">ir arriba</a>)</p>

### 🧮 Calculadora de precios y prorrateo

**Dónde funciona:** Páginas de edición de instalaciones y preinstalaciones.

**Qué hace:** Calcula automáticamente el precio que debe pagar el cliente, incluyendo el **prorrateo** — es decir, si la instalación se hace a mitad de mes, calcula solo los días que quedan y cobra la parte proporcional.

**Cómo funciona:**

1. Lee la **fecha de instalación** del formulario.
2. Toma el **precio del paquete** del plan seleccionado o del texto del comentario.
3. Calcula cuántos días quedan del mes y el prorrateo correspondiente.
4. Actualiza la línea de precios en el comentario (ej: `EQUIPO PRESTADO $1,000 + RESTANTE DE MES FEBRERO $225 = $1,225 MXN`).

**Cómo se usa:**

- Botón "Calcular" en la barra del editor.
- Atajo rápido: `Ctrl+Shift+Alt+P`.
- **Se recalcula solo** al cambiar la fecha de instalación (si la opción está activada en ajustes).

> Si la línea de precios aún no está completa (por ejemplo `EQUIPO PRESTADO $ + RESTANTE DE MES $ = $`), la extensión la completa automáticamente con los valores correctos.

<p align="right">(<a href="#readme-top">ir arriba</a>)</p>

### 📋 Plantilla rápida de instalación

**Dónde funciona:** Páginas de edición de instalaciones y preinstalaciones.

**Qué hace:** Con un solo clic genera una **plantilla lista para pegar** con toda la estructura que necesita un comentario de instalación nueva: tipo de equipo, línea de precios con el mes actual, horario, forma de pago, técnico y asesor.

**Cómo se usa:** Clic en el botón "Plantilla" en la barra del editor → se copia al portapapeles → pégala con `Ctrl+V`.

<p align="right">(<a href="#readme-top">ir arriba</a>)</p>

### 📄 Auto-rellenado de plantilla

**Dónde funciona:** Páginas de edición/creación de instalaciones, preinstalaciones, solicitar instalación y agregar clientes.

**Qué hace:** Si el editor de comentarios está **vacío** y activas el formateador (manual o automático), la extensión inserta automáticamente la plantilla de instalación completa, ya formateada y con los precios calculados si los datos del formulario están disponibles. Si no hay datos de paquete o fecha, inserta la plantilla en blanco pero con el mes correcto según la fecha actual.

**Cómo se activa:** Ajuste "Auto-rellenar plantilla" en el popup (activado por defecto). Funciona junto con el auto-formato o al hacer clic en el botón del formateador.

<p align="right">(<a href="#readme-top">ir arriba</a>)</p>

### 🔢 Calculadora de precios en popup

**Dónde funciona:** Desde el popup de la extensión (disponible en cualquier página).

**Qué hace:** Permite calcular manualmente el precio de una instalación con prorrateo, sin necesidad de estar en una página con editor. Ingresas el precio de instalación (comodato), el precio del paquete mensual y la fecha, y la extensión calcula el resultado con la misma lógica de prorrateo que usa el calculador del editor. Los valores se guardan automáticamente y se restauran al reabrir el popup.

**Cómo se usa:**

1. Abre el popup de la extensión.
2. En la tarjeta **"Calculadora de precios"**, haz clic en **Usar**.
3. Llena los campos (fecha por defecto: hoy, con selector de fecha nativo).
4. Clic en **Calcular** → aparece la línea de resultado (ej: `COMODATO $900 + MES MARZO $200 = $1,100 MXN`).
5. Clic en **Copiar línea** → se copia al portapapeles para pegarla donde necesites.
6. **Limpiar** reinicia todos los valores.

> Los valores persisten entre sesiones del popup. La calculadora siempre está disponible, incluso fuera de WispHub.

<p align="right">(<a href="#readme-top">ir arriba</a>)</p>

### 🎫 Gestión masiva de tickets

**Dónde funciona:** Listas de tickets (`/tickets/`, `/tickets/1/`, `/tickets/2/`, etc.).

**Qué hace:** Agrega una nueva opción al menú de acciones masivas que permite **cambiar varios tickets a "Nuevos" al mismo tiempo**. En WispHub solo puedes cerrar tickets de forma masiva, pero con esta extensión también puedes regresarlos al estado "Nuevo" sin entrar a cada uno.

**Cómo se usa:**

1. Marca los tickets con las casillas de verificación.
2. En el selector de acciones, elige **"Marcar Tickets Como Nuevos"**.
3. Clic en ejecutar → confirma.

> La tabla se configura automáticamente para mostrar **500 registros por página**, así no tienes que cambiar la paginación manualmente.

<p align="right">(<a href="#readme-top">ir arriba</a>)</p>

### 📎 Copiado rápido de ticket

**Dónde funciona:** Listas de tickets.

**Qué hace:** Agrega un **botón de copiado** en la columna de acciones de cada fila de ticket. Al hacer clic, copia al portapapeles un texto con el formato:

```
Barrio/Localidad - Cliente - Asunto
```

**¿Cómo encuentra las columnas?** La extensión busca cada columna por su **nombre** en el encabezado de la tabla (por ejemplo, "Barrio/Localidad", "Cliente", "Asunto"), no por la posición. Esto significa que funciona aunque hayas **reordenado las columnas, ocultado algunas, o las tengas en diferente orden** que otros usuarios. Además, cada columna se identifica de forma independiente, así que nunca se confunde una con otra.

> Del asunto solo se copia la primera parte (antes del guion), para que el texto quede limpio.

<p align="right">(<a href="#readme-top">ir arriba</a>)</p>

### 🔧 Gestión masiva de instalaciones

**Dónde funciona:** Lista de instalaciones (`/Instalaciones/`).

**Qué hace:** Agrega un botón que busca todas las instalaciones con estado **"En Progreso"** y las cambia a **"Nueva"** de forma masiva. Muy útil cuando hay muchas instalaciones pendientes de reasignar.

**Cómo funciona por dentro:** La extensión abre el formulario de edición de cada instalación en segundo plano, cambia el estado a "Nueva" y envía el formulario — igual que si lo hicieras tú manualmente, pero en automático y para todas las filas a la vez.

> La tabla se configura para **mostrar todos los registros** automáticamente al cargar la página.

<p align="right">(<a href="#readme-top">ir arriba</a>)</p>

### � Copiado rápido de instalación

**Dónde funciona:** Lista de instalaciones (`/Instalaciones/`).

**Qué hace:** Agrega un **botón de copiado** en la columna de acciones de cada fila de instalación. Al hacer clic, copia al portapapeles un texto con el formato:

```
Barrio/Localidad - Nombre del Cliente - Inst. Antena
```

El tipo de instalación cambia automáticamente según el dominio:

- En `wisphub.io` → **Inst. Antena**
- En `wisphub.app` → **Inst. Fibra**

Al igual que en los tickets, la extensión busca las columnas por su nombre, no por posición. Funciona aunque las columnas estén ocultas o en diferente orden.

<p align="right">(<a href="#readme-top">ir arriba</a>)</p>

### 📱 Enlaces WhatsApp (teléfonos)

**Dónde funciona:** Lista de clientes (`/clientes/`) y lista de instalaciones (`/Instalaciones/`).

**Qué hace:** Convierte cada número de teléfono en la tabla en un **enlace directo a WhatsApp**. Con un clic se abre WhatsApp con ese número. Si hay varios teléfonos separados por comas, cada uno se convierte en su propio enlace.

**Atajos:**

- **Clic** en un teléfono → abre WhatsApp directamente.
- **Ctrl+Clic** en un teléfono → copia el número al portapapeles (sin abrir WhatsApp).

**Detalles:**

- Agrega automáticamente el código de país de México (+52) a números de 10 dígitos.
- Ignora direcciones IP que podrían confundirse con teléfonos.
- Encuentra la columna de teléfono por el nombre del encabezado ("Teléfono", "Celular", etc.) o analizando el contenido de las celdas.
- Funciona también en filas expandidas (modo responsivo) cuando la columna de teléfono está oculta.

<p align="right">(<a href="#readme-top">ir arriba</a>)</p>

### ⚡ Botones de acción rápida en clientes

**Dónde funciona:** Lista de clientes (`/clientes/`).

**Qué hace:** Agrega dos botones extra en la columna de acciones de cada fila:

- **Ver cliente** → te lleva directo al perfil del cliente.
- **Ver archivos** → te lleva directo a la pestaña de archivos del cliente.

Aparecen junto a los botones de acción que ya tiene WispHub, con separador e iconos propios.

<p align="right">(<a href="#readme-top">ir arriba</a>)</p>

### 📤 Botón flotante "Subir Archivos"

**Dónde funciona:** Página de detalle de un cliente (`/clientes/ver/...`).

**Qué hace:** Muestra un **botón flotante** que te lleva directamente a la pestaña "Subir Archivos" del cliente, sin tener que buscarla entre todas las pestañas.

<p align="right">(<a href="#readme-top">ir arriba</a>)</p>

### 🖼️ Reemplazo de avatar por defecto

**Dónde funciona:** Todas las páginas de WispHub.

**Qué hace:** Detecta la imagen de avatar genérica de WispHub (la que aparece cuando no has subido foto) y la **reemplaza por el avatar personalizado** de la extensión. Funciona en la barra lateral, en el panel y en cualquier lugar donde aparezca el avatar.

> Detecta variantes como `avatar.thumbnail.png`, `avatar_default.jpg`, etc., y observa cambios en la página para reemplazar avatares que se carguen después.

<p align="right">(<a href="#readme-top">ir arriba</a>)</p>

### ⬆️ Botón "Ir arriba"

**Dónde funciona:** Todas las páginas de WispHub.

**Qué hace:** Agrega un **botón flotante** en la esquina inferior que aparece cuando bajas en la página. Al hacer clic, sube suavemente al inicio. Se oculta solo cuando ya estás arriba.

<p align="right">(<a href="#readme-top">ir arriba</a>)</p>

### 🆔 Inyección de IDs de staff

**Dónde funciona:** Página de staff (`/staff/`).

**Qué hace:** Agrega una **columna "ID"** al inicio de la tabla de personal, mostrando el número de ID de cada miembro del equipo. Este ID se obtiene de la API de WispHub.

> Requiere tener configurada una API Key en los ajustes del popup.

<p align="right">(<a href="#readme-top">ir arriba</a>)</p>

### ⚙️ Popup (panel de control)

El icono de la extensión en la barra del navegador abre un **panel de control** con estas secciones:

- **Estado de conexión:** Muestra si estás en WispHub y si el editor está disponible.
- **Info de staff:** Tu nombre de usuario y tu ID (se puede copiar con un clic).
- **Formateador:** Botón para formatear o restaurar el comentario desde el popup.
- **Calculadora:** Calculadora independiente de precios con prorrateo (siempre disponible, sin necesidad de editor ni dominio específico).
- **Ajustes:**
  - Activar/desactivar notificaciones en página.
  - Activar/desactivar auto-formato al cargar.
  - Activar/desactivar auto-cálculo de precios al cargar.
  - Activar/desactivar auto-rellenado de plantilla en editor vacío.
  - Guardar API Keys para `wisphub.io` y `wisphub.app`.
- **Registros (logs):** Historial de acciones de la extensión (máximo 50, se borran después de 24 horas).
- **Changelog:** Lista de cambios por versión.

<p align="right">(<a href="#readme-top">ir arriba</a>)</p>

### 🔔 Notificaciones en página

**Dónde funciona:** Todas las páginas donde la extensión hace algo.

**Qué hace:** Muestra mensajes temporales (éxito, advertencia, error, info) cuando la extensión completa una acción. Las notificaciones desaparecen solas y se pueden apilar si hay varias al mismo tiempo.

> Se pueden desactivar desde los ajustes del popup.

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
│       ├── background.js    #   └── Service worker (API, caché, iconos)
│       └── popup/           #   └── Panel de control (HTML, CSS, JS, changelog)
├── assets/                  # Iconos y recursos estáticos
├── manifest.json            # Configuración de la extensión (Manifest V3)
├── webpack.config.js        # Configuración de Webpack (Chrome + Firefox)
└── package.json             # Dependencias y scripts npm
```

**Flujo de datos simplificado:**

```text
config → utils → lib → features → app (page.js / content.js / background.js)
```

<p align="right">(<a href="#readme-top">ir arriba</a>)</p>

---

## Roadmap

- [x] **v1.0.1** — Primera versión completa: formateador, calculadora de precios flexible, plantilla con cálculo, auto-rellenado de plantilla, calculadora en popup, gestión masiva de tickets e instalaciones, copiado rápido por fila, WhatsApp en clientes e instalaciones, popup con ajustes y logs.
- [ ] Publicación estable en Chrome Web Store.
- [ ] Paquete dedicado para Firefox Add-ons.

<p align="right">(<a href="#readme-top">ir arriba</a>)</p>

---

## Seguridad y permisos

| Aspecto           | Detalle                                                       |
| ----------------- | ------------------------------------------------------------- |
| **Permisos**      | Solo `storage` (guardar ajustes y caché localmente)           |
| **Dominios**      | Restringido a `*.wisphub.io` y `*.wisphub.app`                |
| **Código remoto** | No se usa `eval`, `Function()` ni scripts externos            |
| **API Keys**      | Se guardan localmente en el navegador, nunca salen a terceros |
| **Datos**         | No se recopilan datos personales ni se envía telemetría       |

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
[version-shield]: https://img.shields.io/badge/version-1.0.0-blue?style=for-the-badge
[release-url]: https://github.com/JohnyDeCoder/wisphub-yaa-companion/releases
[manifest-shield]: https://img.shields.io/badge/manifest-v3-orange?style=for-the-badge
[manifest-url]: https://developer.chrome.com/docs/extensions/mv3/intro/
