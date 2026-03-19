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
};

export const ACTIONS = {
  PING: "PING",
  FORMAT_COMMENTS: "FORMAT_COMMENTS",
  UPDATE_SETTINGS: "UPDATE_SETTINGS",
  RESTORE_COMMENTS: "RESTORE_COMMENTS",
  GET_STAFF_INFO: "GET_STAFF_INFO",
  UPDATE_TICKETS: "UPDATE_TICKETS",
  UPDATE_INSTALLS: "UPDATE_INSTALLS",
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
  API_KEYS_SAVED:
    "API Keys guardadas, reinicia la página para que surtan efecto",
  API_KEYS_REMOVED: "API Keys eliminadas",
  PACKAGE_PRICE_REQUIRED: "Ingresa el precio del paquete",
  INSTALL_DATE_REQUIRED: "Selecciona una fecha de instalación",
  RESULT_LINE_COPIED: "Línea copiada al portapapeles",
  COPY_ERROR: "Error al copiar",
  API_KEYS_MISSING_BADGE: "API Keys no configuradas",
  STAFF_ID_COPIED: "¡Copiado!",
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
  NAME_COPY_FAILED: "No se pudo copiar el nombre del cliente",
  NAME_SETTINGS_INVALID:
    "Configuración inválida. Usa: upper, lower o title; o escribe reset",
  NAME_SETTINGS_SAVED: "Configuración guardada",
  NAME_SETTINGS_RESET: "Configuración restablecida",
});
