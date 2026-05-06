export const MESSAGE_TYPES = {
  CHANNEL_HELLO: "WISPHUB_CHANNEL_HELLO",
  CHANNEL_INIT: "WISPHUB_CHANNEL_INIT",
  EDITOR_READY: "WISPHUB_EDITOR_READY",
  FORMAT_REQUEST: "WISPHUB_FORMAT_REQUEST",
  FORMAT_RESPONSE: "WISPHUB_FORMAT_RESPONSE",
  PING_REQUEST: "WISPHUB_PING_REQUEST",
  PING_RESPONSE: "WISPHUB_PING_RESPONSE",
  SETTINGS_UPDATE: "WISPHUB_SETTINGS_UPDATE",
  RESTORE_REQUEST: "WISPHUB_RESTORE_REQUEST",
  RESTORE_RESPONSE: "WISPHUB_RESTORE_RESPONSE",
  LOG_ENTRY: "WISPHUB_LOG_ENTRY",
  UPDATE_TICKETS_REQUEST: "WISPHUB_UPDATE_TICKETS_REQUEST",
  UPDATE_TICKETS_RESPONSE: "WISPHUB_UPDATE_TICKETS_RESPONSE",
  UPDATE_INSTALLS_REQUEST: "WISPHUB_UPDATE_INSTALLS_REQUEST",
  UPDATE_INSTALLS_RESPONSE: "WISPHUB_UPDATE_INSTALLS_RESPONSE",
  DIAGNOSTIC_RUN_REQUEST: "WISPHUB_DIAGNOSTIC_RUN_REQUEST",
  DIAGNOSTIC_RUN_ACK: "WISPHUB_DIAGNOSTIC_RUN_ACK",
  DIAGNOSTIC_RUN_RESPONSE: "WISPHUB_DIAGNOSTIC_RUN_RESPONSE",
  PROFILE_SWITCH_REQUEST: "WISPHUB_PROFILE_SWITCH_REQUEST",
  PROFILE_SWITCH_ACK: "WISPHUB_PROFILE_SWITCH_ACK",
  SESSION_CAPTURE_REQUEST: "WISPHUB_SESSION_CAPTURE_REQUEST",
  CLIENT_QUICK_INFO_REQUEST: "WISPHUB_CLIENT_QUICK_INFO_REQUEST",
  CLIENT_QUICK_INFO_RESPONSE: "WISPHUB_CLIENT_QUICK_INFO_RESPONSE",
};

export const ACTIONS = {
  PING: "PING",
  FORMAT_COMMENTS: "FORMAT_COMMENTS",
  UPDATE_SETTINGS: "UPDATE_SETTINGS",
  RESTORE_COMMENTS: "RESTORE_COMMENTS",
  GET_STAFF_INFO: "GET_STAFF_INFO",
  GET_SESSION_CONTEXT: "GET_SESSION_CONTEXT",
  FETCH_STAFF: "FETCH_STAFF",
  UPDATE_TICKETS: "UPDATE_TICKETS",
  UPDATE_INSTALLS: "UPDATE_INSTALLS",
  RUN_CLIENT_DIAGNOSTIC: "RUN_CLIENT_DIAGNOSTIC",
  START_PROFILE_SWITCH: "START_PROFILE_SWITCH",
  SESSION_CAPTURE_COOKIES: "SESSION_CAPTURE_COOKIES",
  SESSION_HAS_COOKIES: "SESSION_HAS_COOKIES",
  SESSION_SWITCH_COOKIES: "SESSION_SWITCH_COOKIES",
  CLIENT_QUICK_INFO: "CLIENT_QUICK_INFO",
};

export const NOTIFICATION_TYPES = {
  SUCCESS: "success",
  ERROR: "error",
  WARNING: "warning",
  INFO: "info",
};

export const UI_MESSAGES = {
  EDITOR_NOT_FOUND: "Editor no encontrado",
  EDITOR_EMPTY: "El editor está vacío",
  FORMAT_SUCCESS: "¡Comentario formateado!",
  FORMAT_ERROR: "Error al formatear",
  TEXT_RESTORED: "Texto restaurado",
  NOT_WISPHUB: "No estás en WispHub",
  AUTO_FORMAT_APPLIED: "Auto-formateado aplicado",
  PRICE_UPDATED: "¡Precios actualizados!",
  PRICE_NO_CHANGE: "Los precios ya están actualizados",
  PRICE_NO_LINE: "No se encontró línea de precios",
  PRICE_NO_DATE: "Fecha de instalación no encontrada",
  PRICE_NO_PACKAGE: "Precio de paquete no encontrado",
  PRICE_REPLACE_FAIL: "No se pudo reemplazar precios",
  ALREADY_FORMATTED: "Ya se ha formateado",
  NO_FORMATTED_TEXT_TO_RESTORE: "No hay texto formateado para restaurar",
};

export const POPUP_UI_MESSAGES = Object.freeze({
  NO_ACTIVE_TAB: "Sin pestaña activa",
  FORMAT_SUCCESS: "¡Formateado!",
  RESTORE_SUCCESS: "Texto restaurado",
  FORMAT_BUTTON_USE: "Usar",
  FORMAT_BUTTON_RESTORE: "Restaurar",
  USE_EDITOR_BUTTON: "Usa el botón en el editor",
  OPEN_EDITOR_PAGE: "Abre una página con el editor",
  FORMAT_NO_CHANGES: "Sin cambios que aplicar",
  API_KEYS_SAVED:
    "API Keys guardadas, reinicia la página para que surtan efecto",
  API_KEYS_REMOVED: "API Keys eliminadas",
  PACKAGE_PRICE_REQUIRED: "Ingresa el precio del paquete",
  INSTALL_DATE_REQUIRED: "Selecciona una fecha de instalación",
  RESULT_LINE_COPIED: "Línea copiada al portapapeles",
  COPY_ERROR: "Error al copiar",
  DIAGNOSTIC_STARTING: "Iniciando Diagnóstico Express en la página activa",
  DIAGNOSTIC_UNAVAILABLE:
    "Selecciona un cliente en /clientes/ o abre el detalle del cliente",
  DIAGNOSTIC_STARTED: "Diagnóstico Express iniciado",
  DIAGNOSTIC_START_FAILED: "No se pudo iniciar el diagnóstico",
  SESSION_SWITCH_UNAVAILABLE:
    "No se pudo detectar la sesión activa para cambiar de perfil",
  SESSION_SWITCH_STARTING: "Iniciando cambio de perfil",
  SESSION_SWITCH_STARTED: "Cambio de perfil en progreso",
  SESSION_SWITCH_CANCELLED: "Cambio de perfil cancelado",
  SESSION_SWITCH_FAILED: "No se pudo iniciar el cambio de perfil",
  SESSION_SWITCH_TITLE: "Cambiar entre perfiles de sesión",
  SESSION_SWITCH_API_KEYS_MISSING:
    "Falta configurar API Keys. Click para abrir Configuración avanzada",
  API_KEYS_MISSING_BADGE: "API Keys no configuradas",
  STAFF_ID_COPIED: "¡Copiado!",
  QUICK_INFO_SAVED: "Vista rápida guardada",
  PWD_NO_TYPE: "Selecciona al menos un tipo de carácter",
});

export const CONNECTION_UI_MESSAGES = Object.freeze({
  DISCONNECTED_GENERIC: "No se pudo conectar",
  NO_ACTIVE_TAB: "Sin pestaña activa",
  NOT_IN_WISPHUB: "Navega a WispHub",
  CHECKING: "Verificando...",
  CONNECTION_ERROR: "Error de conexión",
  READY: "Todo listo",
  PARTIAL: "Cargado parcialmente",
});

export const TICKETS_UI_MESSAGES = Object.freeze({
  COPY_TEXT_BUILD_FAILED: "No se pudo construir el texto del ticket",
  COPY_TEXT_FAILED: "No se pudo copiar el texto del ticket",
  SELECT_AT_LEAST_ONE: "Selecciona al menos un ticket",
  CHANNEL_NOT_READY: "Canal de comunicación no listo. Intenta de nuevo.",
  CONFIRM_MARK_AS_NEW: (count) => `¿Marcar ${count} ticket(s) como Nuevos?`,
  PROCESSING: (count) => `Procesando ${count} ticket(s)...`,
  UPDATE_TIMEOUT: "Tiempo de espera agotado al actualizar tickets",
  UPDATE_SEND_FAILED: "No se pudo enviar la solicitud de actualización",
  NO_SERVER_RESPONSE: "Error: sin respuesta del servidor",
  SUCCESS_MARKED: (success) => `${success} ticket(s) marcados como Nuevos`,
  PARTIAL_SUCCESS: (success, failed) => `${success} OK, ${failed} con error`,
  TOTAL_FAILURE: (failed) => `Error al actualizar ${failed} ticket(s)`,
});

export const INSTALLS_UI_MESSAGES = Object.freeze({
  COPY_TEXT_BUILD_FAILED: "No se pudo construir el texto de la instalación",
  COPY_TEXT_FAILED: "No se pudo copiar el texto de la instalación",
  NO_IN_PROGRESS: 'No se encontraron instalaciones "En Progreso"',
  CONFIRM_MARK_AS_NEW: (count) =>
    `¿Marcar ${count} instalación(es) de "En Progreso" a "Nueva"?`,
  PROCESSING: (count) => `Procesando ${count} instalación(es)...`,
  SUCCESS_MARKED: (count) => `${count} instalación(es) marcadas como Nuevas`,
  PARTIAL_SUCCESS: (success, failed) => `${success} OK, ${failed} con error`,
  TOTAL_FAILURE: (failed) => `Error al actualizar ${failed} instalación(es)`,
});

export const TICKET_AUTOFILL_UI_MESSAGES = Object.freeze({
  SPECIAL_SUCCESS: (label) => `Ticket especial "${label}" auto-rellenado`,
  NORMAL_SUCCESS: "Campos auto-rellenados",
  PARTIAL_FILL: "Algunos campos no se pudieron auto-rellenar",
  FILL_ERROR: "Error al auto-rellenar campos",
});

export const TEMPLATE_UI_MESSAGES = Object.freeze({
  COPY_SUCCESS: "Plantilla generada y copiada al portapapeles",
  COPY_ERROR: "Error al generar plantilla",
});

export const CLIENTS_UI_MESSAGES = Object.freeze({
  TEMPLATE_BUILD_FAILED:
    "No se pudo construir la plantilla del cliente para aprovisionamiento",
  TEMPLATE_COPY_FAILED:
    "No se pudo copiar la plantilla del cliente para aprovisionamiento",
  TEMPLATE_MISSING_FIELDS_WARNING: (fields) => {
    const fieldList = Array.isArray(fields) ? fields.filter(Boolean) : [];
    if (fieldList.length === 0) {
      return "Plantilla copiada con campos pendientes por completar";
    }
    return `Plantilla copiada con campos pendientes: ${fieldList.join(", ")}`;
  },
  PHONE_COPIED: (phone) => `Teléfono copiado: ${phone}`,
  COORDINATES_COPIED: (text) => `Coordenadas copiadas: ${text}`,
  QUICK_INFO_NO_API_KEY: "Configura las API Keys en la extensión para ver esta sección",
  QUICK_INFO_API_ERROR: (error) => `Error de API: ${error}`,
  NAME_COPY_FAILED: "No se pudo copiar el nombre del cliente",
  NAME_SETTINGS_INVALID:
    "Configuración inválida. Usa: upper, lower o title; o escribe reset",
  NAME_SETTINGS_SAVED: "Configuración guardada",
  NAME_SETTINGS_RESET: "Configuración restablecida",
  DIAGNOSTIC_TOOLTIP: "Ejecutar Diagnóstico Express",
  DIAGNOSTIC_OPEN_PING_TOOLTIP: "Abrir Ping del cliente",
  DIAGNOSTIC_OPEN_TORCH_TOOLTIP: "Abrir Torch del cliente",
  DIAGNOSTIC_OPEN_TRAFFIC_TOOLTIP: "Abrir Tráfico semanal del cliente",
  DIAGNOSTIC_OPEN_CLIENT_INFO_TOOLTIP: "Abrir información del cliente",
  DIAGNOSTIC_RUNNING: "Ejecutando Diagnóstico Express...",
  DIAGNOSTIC_COMPLETED: "Diagnóstico Express finalizado",
  DIAGNOSTIC_COMPLETED_PARTIAL:
    "Diagnóstico Express finalizado con datos parciales",
  DIAGNOSTIC_COMPLETED_ERROR: "Diagnóstico Express finalizado con errores",
  DIAGNOSTIC_COPIED: "Diagnóstico Express copiado",
  DIAGNOSTIC_COPIED_PARTIAL: "Diagnóstico Express parcial copiado",
  DIAGNOSTIC_COPIED_ERROR: "Diagnóstico Express con errores copiado",
  DIAGNOSTIC_COPY_FAILED: "Diagnóstico generado, pero no se pudo copiar",
  DIAGNOSTIC_ALREADY_RUNNING:
    "Ya existe un Diagnóstico Express ejecutándose en esta página",
  DIAGNOSTIC_CONTEXT_MISSING: "No se pudo obtener el contexto del cliente",
  DIAGNOSTIC_AUTH_REQUIRED:
    "Sesión no autorizada (401). Inicia sesión y vuelve a intentar",
  DIAGNOSTIC_FORBIDDEN:
    "Sin permisos para ejecutar diagnóstico (403) en esta cuenta",
  DIAGNOSTIC_CANCELLED: "Diagnóstico cancelado por el usuario",
  DIAGNOSTIC_TIMEOUT: "Tiempo de espera agotado durante el diagnóstico",
  DIAGNOSTIC_TASK_FAILED:
    "La tarea interna de WispHub falló durante el diagnóstico",
  DIAGNOSTIC_PARSE_FAILED:
    "No se pudo interpretar la respuesta de WispHub para el diagnóstico",
  DIAGNOSTIC_RUN_FAILED: "No se pudo ejecutar Diagnóstico Express",
});
