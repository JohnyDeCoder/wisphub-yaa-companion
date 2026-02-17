import { browserAPI } from '../../utils/browser.js';

const CUSTOM_AVATAR_URL = browserAPI?.runtime?.getURL?.('assets/images/avatar.jpg') || '';
const OVERRIDDEN_ATTR = 'data-wisphub-yaa-avatar-overridden';
const WISPHUB_DEFAULT_AVATAR_SRC_RE =
  /\/media\/usuarios\/avatar(?:[._-]?thumbnail)?\.(?:png|jpe?g|gif|webp)(?:[?#].*)?$/i;
const INVALID_EXTENSION_URL_RE = /^(?:chrome|moz)-extension:\/\/invalid\//i;

const DEFAULT_AVATAR_HINTS = [
  'avatar[-_ ]?default',
  'default[-_ ]?avatar',
  'profile[-_ ]?default',
  'default[-_ ]?profile',
  'user[-_ ]?default',
  'default[-_ ]?user',
  'no[-_ ]?avatar',
  'sin[-_ ]?foto',
  'placeholder',
  'anon(?:ymous)?',
];

const DEFAULT_AVATAR_HINT_RE = new RegExp(`(${DEFAULT_AVATAR_HINTS.join('|')})`, 'i');
const AVATAR_CONTEXT_HINT_RE = /(avatar|perfil|profile|usuario|user|gravatar)/i;

let queuedFrame = 0;
const pendingRoots = new Set();
let initialized = false;

function hasUsableAvatarUrl() {
  return !!CUSTOM_AVATAR_URL && !INVALID_EXTENSION_URL_RE.test(CUSTOM_AVATAR_URL);
}

function shouldReplaceAvatar(img) {
  if (!(img instanceof HTMLImageElement)) {
    return false;
  }

  if (!hasUsableAvatarUrl()) {
    return false;
  }

  const src = (img.getAttribute('src') || img.currentSrc || img.getAttribute('data-src') || '').toLowerCase();
  const isAlreadyOverridden = img.getAttribute(OVERRIDDEN_ATTR) === '1';

  if (isAlreadyOverridden) {
    return !src.includes(CUSTOM_AVATAR_URL.toLowerCase());
  }

  if (WISPHUB_DEFAULT_AVATAR_SRC_RE.test(src)) {
    return true;
  }

  const className = (img.className || '').toString().toLowerCase();
  const alt = (img.getAttribute('alt') || '').toLowerCase();
  const title = (img.getAttribute('title') || '').toLowerCase();
  const meta = `${src} ${className} ${alt} ${title}`;

  if (!DEFAULT_AVATAR_HINT_RE.test(meta) || !AVATAR_CONTEXT_HINT_RE.test(meta)) {
    return false;
  }

  return !src.includes(CUSTOM_AVATAR_URL.toLowerCase());
}

function replaceAvatar(img) {
  if (!shouldReplaceAvatar(img)) {
    return;
  }

  img.setAttribute('src', CUSTOM_AVATAR_URL);
  if (img.hasAttribute('srcset')) {
    img.removeAttribute('srcset');
  }
  if (img.hasAttribute('data-src')) {
    img.setAttribute('data-src', CUSTOM_AVATAR_URL);
  }

  img.setAttribute(OVERRIDDEN_ATTR, '1');
}

function processNode(root) {
  if (!(root instanceof Element)) {
    return;
  }

  if (root.matches('img')) {
    replaceAvatar(root);
    return;
  }

  root.querySelectorAll('img').forEach(replaceAvatar);
}

function flushQueue() {
  queuedFrame = 0;
  pendingRoots.forEach((root) => processNode(root));
  pendingRoots.clear();
}

function queueNode(root) {
  if (!(root instanceof Element)) {
    return;
  }

  pendingRoots.add(root);
  if (queuedFrame) {
    return;
  }

  queuedFrame = window.requestAnimationFrame(flushQueue);
}

function observeAvatarNodes() {
  if (!document.body) {
    return;
  }

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'attributes') {
        if (mutation.target instanceof Element) {
          queueNode(mutation.target);
        }
        return;
      }

      mutation.addedNodes.forEach((node) => {
        if (node instanceof Element) {
          queueNode(node);
        }
      });
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['src', 'data-src', 'srcset'],
  });
}

export function initDefaultAvatarReplacement() {
  if (!hasUsableAvatarUrl() || initialized) {
    return;
  }

  initialized = true;
  queueNode(document.body || document.documentElement);
  observeAvatarNodes();
}
