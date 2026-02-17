import { sendLogToPopup } from '../../utils/logger.js';
import { applyHostTooltip } from '../../utils/hostTooltip.js';

const BUTTON_ID = 'wisphub-upload-files-btn';

function log(consoleMsg, popupMsg, level = 'info') {
  sendLogToPopup('Clients', level, consoleMsg, popupMsg);
}

function createUploadButton() {
  if (document.getElementById(BUTTON_ID)) {
    return;
  }

  const uploadTab = document.querySelector('a[href="#retab6"]');
  if (!uploadTab) {
    return;
  }

  const btn = document.createElement('button');
  btn.id = BUTTON_ID;
  btn.type = 'button';
  applyHostTooltip(btn, 'Ir a Subir Archivos', { placement: 'left' });

  btn.addEventListener('click', () => {
    uploadTab.click();
    window.location.hash = '#retab6';
    log('Navigated to Upload Files tab', 'Navegó a pestaña Subir Archivos');
  });

  document.body.appendChild(btn);
  log('Upload Files button injected', 'Botón Subir Archivos inyectado');
}

export function initClientUploadButton() {
  const path = window.location.pathname;
  if (!/\/clientes\/ver\//i.test(path)) {
    return;
  }

  setTimeout(createUploadButton, 1000);
}
