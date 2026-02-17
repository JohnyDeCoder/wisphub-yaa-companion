import { NOTIFICATION_ID, TIMING } from "../../../config/constants.js";

const STROKE_ATTRS =
  'stroke="currentColor" stroke-linecap="round"' +
  ' stroke-linejoin="round" stroke-width="2"';

const ICON_PATHS = {
  success: `<path ${STROKE_ATTRS} d="M8.5 11.5 11 14l4-4m6 2a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/>`,
  info: `<path ${STROKE_ATTRS} d="M10 11h2v5m-2 0h4m-2.592-8.5h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/>`,
  warning: `<path ${STROKE_ATTRS} d="M12 13V8m0 8h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/>`,
  error: `<path ${STROKE_ATTRS} d="m15 9-6 6m0-6 6 6m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/>`,
};

const LOADING_ICON =
  '<circle cx="12" cy="12" r="9" stroke="currentColor"' +
  ' stroke-width="2.5" fill="none"' +
  ' stroke-dasharray="40 20"/>';

const CLOSE_ICON = `<path ${STROKE_ATTRS} d="M6 18 17.94 6M18 18 6.06 6"/>`;

const MAX_STACK = 3;
const CONTAINER_ID = `${NOTIFICATION_ID}-container`;

let notificationsEnabled = true;
let notifCounter = 0;

const SVG_NS = "http://www.w3.org/2000/svg";

function createSvg(pathMarkup) {
  const raw = `<svg xmlns="${SVG_NS}" viewBox="0 0 24 24">${pathMarkup}</svg>`;
  const doc = new DOMParser().parseFromString(raw, "image/svg+xml");
  const parsed = doc.documentElement;
  parsed.setAttribute("aria-hidden", "true");
  parsed.setAttribute("fill", "none");
  return parsed;
}

function getOrCreateContainer() {
  let container = document.getElementById(CONTAINER_ID);
  if (!container) {
    container = document.createElement("div");
    container.id = CONTAINER_ID;
    container.className = "wisphub-yaa-notification-container";
    document.body.appendChild(container);
  }
  return container;
}

function dismissNotification(el, timer) {
  clearTimeout(timer);
  el.classList.add("wisphub-yaa-notification-fade");
  setTimeout(() => el.remove(), 300);
}

export function updateNotificationSettings(settings) {
  if (typeof settings?.notificationsEnabled === "boolean") {
    notificationsEnabled = settings.notificationsEnabled;
  }
}

export function showNotification(message, type, duration) {
  if (!notificationsEnabled) {
    return () => {};
  }

  const container = getOrCreateContainer();
  const items = container.querySelectorAll(".wisphub-yaa-notification");

  if (items.length >= MAX_STACK) {
    const oldest = items[0];
    oldest.classList.add("wisphub-yaa-notification-fade");
    setTimeout(() => oldest.remove(), 300);
  }

  notifCounter++;
  const displayTime = duration || TIMING.NOTIFICATION_DURATION;
  const iconSvg =
    type === "loading" ? LOADING_ICON : ICON_PATHS[type] || ICON_PATHS.info;

  const notification = document.createElement("div");
  notification.id = `${NOTIFICATION_ID}-${notifCounter}`;
  notification.className = `wisphub-yaa-notification wisphub-yaa-notification-${type}`;
  notification.style.setProperty(
    "--wt-notification-duration",
    `${displayTime}ms`,
  );

  const content = document.createElement("div");
  content.className = "wisphub-yaa-notification-content";

  const iconWrap = document.createElement("div");
  iconWrap.className = "wisphub-yaa-notification-icon";
  const iconEl = createSvg(iconSvg);
  iconWrap.appendChild(iconEl);

  const textEl = document.createElement("div");
  textEl.className = "wisphub-yaa-notification-text";
  textEl.textContent = message;

  content.append(iconWrap, textEl);

  const closeBtn = document.createElement("button");
  closeBtn.className = "wisphub-yaa-notification-close";
  closeBtn.setAttribute("aria-label", "Close");
  closeBtn.appendChild(createSvg(CLOSE_ICON));

  const progress = document.createElement("div");
  progress.className = "wisphub-yaa-notification-progress";

  notification.append(content, closeBtn, progress);

  const timer = setTimeout(() => {
    dismissNotification(notification, 0);
  }, displayTime);

  closeBtn.addEventListener("click", () => {
    dismissNotification(notification, timer);
  });

  container.appendChild(notification);

  return () => dismissNotification(notification, timer);
}
