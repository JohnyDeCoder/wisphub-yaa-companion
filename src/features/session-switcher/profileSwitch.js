import {
  PROFILE_SWITCH_MAX_AGE_MS,
  PROFILE_SWITCH_STORAGE_KEY,
  buildLogoutRedirectUrl,
  isLoginPath,
  isLogoutPath,
  resolveSectionBasePath,
  resolveSessionProfileLabel,
  splitUsername,
} from "../../config/sessionProfiles.js";
import { getDomainKey } from "../../config/domains.js";
import { normalizeValue } from "../../utils/string.js";

const USERNAME_SELECTORS = Object.freeze([
  ".user-menu .user-name",
  ".navbar .user-name",
  ".dropdown .user-name",
]);

const PERSISTENT_NOTIFICATION_DURATION = Number.POSITIVE_INFINITY;

function dispatchInputEvents(input) {
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

function safeReadStorage(storage, key) {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

function safeWriteStorage(storage, key, value) {
  try {
    storage.setItem(key, value);
  } catch {
    // Ignore storage write failures
  }
}

function safeRemoveStorage(storage, key) {
  try {
    storage.removeItem(key);
  } catch {
    // Ignore storage removal failures
  }
}

function clearActiveNotification(documentObj) {
  const dismiss = documentObj?.defaultView?.__WISPHUB_PROFILE_SWITCH_DISMISS__;
  if (typeof dismiss === "function") {
    dismiss();
  }
  if (documentObj?.defaultView) {
    documentObj.defaultView.__WISPHUB_PROFILE_SWITCH_DISMISS__ = null;
  }
}

function showPersistentNotification(
  documentObj,
  notifyFn,
  message,
  type,
  onClose,
) {
  clearActiveNotification(documentObj);

  if (typeof notifyFn !== "function") {
    return;
  }

  const dismiss = notifyFn(
    message,
    type,
    PERSISTENT_NOTIFICATION_DURATION,
    onClose,
  );

  if (documentObj?.defaultView) {
    documentObj.defaultView.__WISPHUB_PROFILE_SWITCH_DISMISS__ =
      typeof dismiss === "function" ? dismiss : null;
  }
}

function showTransientNotification(
  documentObj,
  notifyFn,
  message,
  type = "info",
  duration = 5000,
) {
  if (typeof notifyFn !== "function") {
    return;
  }
  clearActiveNotification(documentObj);
  notifyFn(message, type, duration);
}

function prefillLoginUsername(documentObj, username) {
  const input = documentObj.querySelector("#id_login, input[name='login']");
  if (!input) {
    return false;
  }

  const targetValue = String(username || "").trim();
  if (!targetValue) {
    return false;
  }

  const currentValue = String(input.value || "")
    .trim()
    .toLowerCase();
  if (!currentValue) {
    input.value = targetValue;
    dispatchInputEvents(input);
  }
  return true;
}

function submitLogoutFormIfPresent(documentObj) {
  const form = documentObj.querySelector(
    'form[action^="/accounts/logout"], form:not([action])',
  );
  if (!form) {
    return false;
  }
  if (form.dataset.wisphubYaaAutoSubmitted === "1") {
    return true;
  }

  form.dataset.wisphubYaaAutoSubmitted = "1";
  if (typeof form.requestSubmit === "function") {
    form.requestSubmit();
    return true;
  }
  form.submit();
  return true;
}

function buildPendingRecord({
  domainKey,
  sourceUsername,
  targetUsername,
  targetLabel,
  basePath,
}) {
  return {
    id: `switch-${Date.now()}`,
    domainKey,
    sourceUsername: String(sourceUsername || "").trim(),
    targetUsername: String(targetUsername || "").trim(),
    targetLabel: String(targetLabel || "Perfil").trim() || "Perfil",
    basePath: String(basePath || "/panel/").trim() || "/panel/",
    createdAt: Date.now(),
  };
}

function formatAccountDomain(username, fallback = "sin-perfil") {
  const { accountDomain } = splitUsername(username);
  return accountDomain || fallback;
}

function buildLoginGuideText(username) {
  const { accountDomain } = splitUsername(username);
  return accountDomain ? `una cuenta @${accountDomain}` : "el perfil indicado";
}

function markLoginPromptShown(pendingRecord, storage) {
  if (!pendingRecord || pendingRecord.loginPromptShown === true) {
    return pendingRecord;
  }

  const nextRecord = {
    ...pendingRecord,
    loginPromptShown: true,
  };
  savePendingProfileSwitch(nextRecord, storage);
  return nextRecord;
}

export function readPendingProfileSwitch(storage = window.localStorage) {
  const raw = safeReadStorage(storage, PROFILE_SWITCH_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function savePendingProfileSwitch(
  pendingRecord,
  storage = window.localStorage,
) {
  safeWriteStorage(
    storage,
    PROFILE_SWITCH_STORAGE_KEY,
    JSON.stringify(pendingRecord),
  );
}

export function clearPendingProfileSwitch(storage = window.localStorage) {
  safeRemoveStorage(storage, PROFILE_SWITCH_STORAGE_KEY);
}

export function isPendingProfileSwitchExpired(
  pendingRecord,
  nowMs = Date.now(),
  maxAgeMs = PROFILE_SWITCH_MAX_AGE_MS,
) {
  const createdAt = Number(pendingRecord?.createdAt);
  if (!Number.isFinite(createdAt) || createdAt <= 0) {
    return true;
  }
  return nowMs - createdAt > maxAgeMs;
}

export function getSessionContextFromPage(
  documentObj = document,
  locationObj = window.location,
) {
  const pathname = String(locationObj?.pathname || "").trim() || "/";
  const domainKey = getDomainKey(locationObj?.hostname || "");

  let username = "";
  for (const selector of USERNAME_SELECTORS) {
    const candidate = documentObj.querySelector(selector);
    const value = String(candidate?.textContent || "").trim();
    if (value) {
      username = value;
      break;
    }
  }

  const usernameParts = splitUsername(username);
  return {
    domainKey,
    pathname,
    isLoginPage: isLoginPath(pathname),
    isLogoutPage: isLogoutPath(pathname),
    loggedIn: Boolean(username),
    username,
    accountDomain: usernameParts.accountDomain,
  };
}

export function startProfileSwitchFlow(
  request,
  {
    context = null,
    confirmFn = window.confirm.bind(window),
    locationObj = window.location,
    storage = window.localStorage,
    documentObj = document,
    notify = null,
    navigateImmediately = true,
  } = {},
) {
  const pageContext =
    context || getSessionContextFromPage(documentObj, locationObj);
  const targetUsername = String(request?.targetUsername || "").trim();
  const targetLabel = String(request?.targetLabel || "").trim() || "Perfil";

  if (!targetUsername) {
    return {
      success: false,
      started: false,
      error: "No se recibió el usuario destino para el cambio de perfil",
    };
  }

  if (!pageContext?.domainKey) {
    return {
      success: false,
      started: false,
      error: "No se pudo detectar el dominio activo de WispHub",
    };
  }

  const currentUsername = String(pageContext.username || "").trim();
  const isAlreadyOnTarget =
    pageContext.loggedIn &&
    normalizeValue(currentUsername) === normalizeValue(targetUsername);

  if (isAlreadyOnTarget) {
    return {
      success: true,
      started: false,
      info: `Ya estás en el perfil ${targetLabel}`,
    };
  }

  const currentLabel = currentUsername
    ? resolveSessionProfileLabel(pageContext.domainKey, currentUsername)
    : "Sin sesión";
  const basePath = resolveSectionBasePath(pageContext.pathname);

  const currentDomain = formatAccountDomain(currentUsername);
  const targetDomain = formatAccountDomain(targetUsername);
  const confirmationText = [
    `Vas a cambiar al perfil ${targetLabel} (${targetDomain}).`,
    `Perfil actual: ${currentLabel} (${currentDomain}).`,
    "Se cerrará la sesión actual y se abrirá login asistido.",
    "Si no hay sesión activa en el perfil destino, tendrás que iniciar sesión manualmente.",
    "Puedes cancelar el seguimiento cerrando la notificación en pantalla.",
    "¿Deseas continuar?",
  ].join("\n\n");

  if (typeof confirmFn === "function" && !confirmFn(confirmationText)) {
    return {
      success: false,
      started: false,
      cancelled: true,
      error: "Cambio de perfil cancelado por el usuario",
    };
  }

  const pendingRecord = buildPendingRecord({
    domainKey: pageContext.domainKey,
    sourceUsername: currentUsername,
    targetUsername,
    targetLabel,
    basePath,
  });

  savePendingProfileSwitch(pendingRecord, storage);
  const preferCookieSwitch = request?.preferCookieSwitch === true;
  const fallbackRedirectUrl = buildLogoutRedirectUrl(basePath);

  if (preferCookieSwitch) {
    showTransientNotification(
      documentObj,
      notify,
      `Cambio de perfil iniciado a ${targetLabel} con sesión guardada.`,
      "info",
      5200,
    );

    if (navigateImmediately && typeof locationObj.assign === "function") {
      locationObj.assign(basePath);
    }

    return {
      success: true,
      started: true,
      requiresLogin: false,
      switchStrategy: "cookie-swap",
      targetUsername,
      targetLabel,
      redirectUrl: basePath,
      fallbackRedirectUrl,
    };
  }

  showTransientNotification(
    documentObj,
    notify,
    `Cambio de perfil iniciado a ${targetLabel}.`,
    "info",
    5200,
  );

  if (navigateImmediately && typeof locationObj.assign === "function") {
    locationObj.assign(fallbackRedirectUrl);
  }

  return {
    success: true,
    started: true,
    requiresLogin: true,
    switchStrategy: "login-assist",
    targetUsername,
    targetLabel,
    redirectUrl: fallbackRedirectUrl,
    fallbackRedirectUrl,
  };
}

export function resumeProfileSwitchFlow({
  storage = window.localStorage,
  documentObj = document,
  locationObj = window.location,
  notify = null,
  onCompleted = null,
} = {}) {
  const pending = readPendingProfileSwitch(storage);
  if (!pending) {
    clearActiveNotification(documentObj);
    return { active: false, reason: "no-pending-switch" };
  }

  const context = getSessionContextFromPage(documentObj, locationObj);
  if (!context.domainKey || context.domainKey !== pending.domainKey) {
    clearPendingProfileSwitch(storage);
    clearActiveNotification(documentObj);
    return { active: false, reason: "domain-mismatch" };
  }

  if (isPendingProfileSwitchExpired(pending)) {
    clearPendingProfileSwitch(storage);
    clearActiveNotification(documentObj);
    showTransientNotification(
      documentObj,
      notify,
      "Seguimiento del cambio de perfil expiró. Intenta nuevamente.",
      "warning",
      3000,
    );
    return { active: false, reason: "expired" };
  }

  const cancelTracking = () => {
    clearPendingProfileSwitch(storage);
    clearActiveNotification(documentObj);
  };

  if (context.loggedIn) {
    const { accountDomain: targetDomain } = splitUsername(
      pending.targetUsername,
    );
    const { accountDomain: currentDomain } = splitUsername(context.username);
    if (normalizeValue(currentDomain) === normalizeValue(targetDomain)) {
      clearPendingProfileSwitch(storage);
      clearActiveNotification(documentObj);
      showTransientNotification(
        documentObj,
        notify,
        `Sesión cambiada correctamente a ${pending.targetLabel}.`,
        "success",
        2000,
      );
      if (typeof onCompleted === "function") {
        try {
          onCompleted(context, pending);
        } catch {
          // Completion hooks should not block the profile switch flow.
        }
      }
      return { active: false, reason: "completed" };
    }
  }

  if (context.isLogoutPage) {
    const submitted = submitLogoutFormIfPresent(documentObj);
    if (submitted) {
      showPersistentNotification(
        documentObj,
        notify,
        `Cerrando sesión actual para continuar con ${pending.targetLabel}...`,
        "info",
        cancelTracking,
      );
    }
    return { active: true, state: "logging-out" };
  }

  if (context.isLoginPage) {
    prefillLoginUsername(documentObj, pending.targetUsername);
    markLoginPromptShown(pending, storage);
    const guideText = buildLoginGuideText(pending.targetUsername);
    showPersistentNotification(
      documentObj,
      notify,
      `Inicia sesión con ${guideText}.`,
      "info",
      cancelTracking,
    );
    return { active: true, state: "awaiting-login" };
  }

  if (context.loggedIn) {
    const guideText = buildLoginGuideText(pending.targetUsername);
    if (pending.loginPromptShown !== true) {
      locationObj.assign(buildLogoutRedirectUrl(pending.basePath || "/panel/"));
      showPersistentNotification(
        documentObj,
        notify,
        `Cerrando sesión actual para continuar con ${pending.targetLabel}...`,
        "info",
        cancelTracking,
      );
      return { active: true, state: "logging-out" };
    }

    showPersistentNotification(
      documentObj,
      notify,
      `Perfil incorrecto detectado. Iniciaste como ${context.username}. Debes iniciar con ${guideText}.`,
      "error",
      cancelTracking,
    );
    locationObj.assign(buildLogoutRedirectUrl(pending.basePath || "/panel/"));
    return { active: true, state: "wrong-profile" };
  }

  const guideText = buildLoginGuideText(pending.targetUsername);
  showPersistentNotification(
    documentObj,
    notify,
    `Cambio a ${pending.targetLabel} en progreso. Continúa el inicio de sesión con ${guideText}.`,
    "warning",
    cancelTracking,
  );
  return { active: true, state: "pending" };
}
