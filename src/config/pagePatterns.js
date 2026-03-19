export const TICKETS_EDITOR_PATH_RE = /\/tickets\/(editar|agregar)/i;
export const CLIENT_SERVICE_EDIT_PATH_RE = /\/clientes\/editar\/servicio/i;
export const CLIENT_EDIT_PATH_RE = /\/clientes\/editar/i;
export const CLIENT_ADD_PATH_RE = /\/clientes\/agregar/i;
export const INSTALLATION_FLOW_PATH_RE =
  /\/(instalaciones\/(editar|agregar|nuevo)|preinstalacion\/(activar|editar)|solicitar-instalacion)/i;

const EDITOR_REQUIRED_PATHS = [
  /^\/(instalaciones|clientes)\/(editar|agregar|nuevo)/i,
  /^\/preinstalacion\/(activar|editar)/i,
  /^\/solicitar-instalacion/i,
];

function toPath(pathname) {
  return String(pathname || "");
}

export function isInstallationFlowPath(pathname = "") {
  return INSTALLATION_FLOW_PATH_RE.test(toPath(pathname));
}

export function isFormatterScopePath(pathname = "") {
  const path = toPath(pathname);
  if (CLIENT_SERVICE_EDIT_PATH_RE.test(path)) {
    return false;
  }
  return (
    isInstallationFlowPath(path) ||
    CLIENT_ADD_PATH_RE.test(path) ||
    CLIENT_EDIT_PATH_RE.test(path)
  );
}

export function isCommentCompleterPath(pathname = "") {
  const path = toPath(pathname);
  return isInstallationFlowPath(path) || CLIENT_ADD_PATH_RE.test(path);
}

export function needsEditorPath(pathname = "") {
  const path = toPath(pathname);
  return EDITOR_REQUIRED_PATHS.some((re) => re.test(path));
}
