const ACTION_BUTTON_SELECTOR = '.wisphub-yaa-action-btn';
const ACTION_GROUP_CLASS = 'wisphub-yaa-action-group';
const ACTION_SEPARATOR_CLASS = 'wisphub-yaa-action-separator';

export function decorateActionButtonGroup(container) {
  if (!container) {
    return;
  }

  container.classList.add(ACTION_GROUP_CLASS);

  const firstActionButton = container.querySelector(ACTION_BUTTON_SELECTOR);
  if (!firstActionButton) {
    return;
  }

  let separator = container.querySelector(`.${ACTION_SEPARATOR_CLASS}`);
  if (!separator) {
    separator = document.createElement('span');
    separator.className = ACTION_SEPARATOR_CLASS;
    separator.setAttribute('aria-hidden', 'true');
  }

  if (firstActionButton.previousElementSibling !== separator) {
    firstActionButton.before(separator);
  }
}
