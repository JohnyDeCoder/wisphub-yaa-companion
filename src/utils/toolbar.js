import { applyHostTooltip } from './hostTooltip.js';

export function createToolbarButton({ id, label, title, onClick }) {
  const btn = document.createElement('a');
  btn.id = id;
  btn.className = 'cke_button cke_button_off wisphub-toolbar-btn';
  btn.href = 'javascript:void(0)';
  applyHostTooltip(btn, title, { placement: 'bottom' });
  btn.tabIndex = -1;
  btn.setAttribute('role', 'button');
  btn.setAttribute('aria-labelledby', `${id}_label`);
  btn.setAttribute('aria-haspopup', 'false');

  const icon = document.createElement('span');
  icon.className = 'cke_button_icon';
  const lbl = document.createElement('span');
  lbl.id = `${id}_label`;
  lbl.className = 'cke_button_label';
  lbl.setAttribute('aria-hidden', 'false');
  lbl.textContent = label;
  btn.append(icon, lbl);

  btn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    onClick(e);
  });

  return btn;
}

export function injectIntoToolbar(editor, buttonId, containerClass, button, afterSelector) {
  if (document.getElementById(buttonId)) {
    return true;
  }

  const wrapper = document.getElementById(`cke_${editor.name}`);
  if (!wrapper) {
    return false;
  }

  const toolbox = wrapper.querySelector('.cke_toolbox');
  if (!toolbox) {
    return false;
  }

  const container = document.createElement('span');
  container.className = `cke_toolbar ${containerClass}`;
  container.setAttribute('role', 'toolbar');
  container.appendChild(button);

  if (afterSelector) {
    const selectors = afterSelector.split(',').map((s) => s.trim());
    for (const sel of selectors) {
      const anchor = toolbox.querySelector(sel);
      if (anchor) {
        anchor.after(container);
        return true;
      }
    }
  }

  toolbox.insertBefore(container, toolbox.firstChild);
  return true;
}

export function addKeyboardShortcut(keys, buttonId) {
  document.addEventListener('keydown', (e) => {
    const match =
      (keys.ctrl ? e.ctrlKey : true) &&
      (keys.shift ? e.shiftKey : true) &&
      (keys.alt ? e.altKey : true) &&
      e.key.toUpperCase() === keys.key;

    if (match) {
      e.preventDefault();
      e.stopPropagation();
      const btn = document.getElementById(buttonId);
      if (btn) {
        btn.click();
      }
    }
  });
}
