import { applyHostTooltip } from '../../utils/hostTooltip.js';

const SCROLL_TOP_BUTTON_ID = 'wisphub-yaa-scroll-top-btn'; // DOM ID for the floating "go to top" button
const SCROLL_TOP_VISIBLE_CLASS = 'wisphub-yaa-visible'; // CSS class that toggles button visibility state
const VISIBILITY_SCROLL_THRESHOLD = 220; // Min scrollY in px before showing the floating button (default: 220)

function getButton() {
  return document.getElementById(SCROLL_TOP_BUTTON_ID);
}

function syncButtonVisibility(button) {
  const shouldShow = window.scrollY > VISIBILITY_SCROLL_THRESHOLD;
  button.classList.toggle(SCROLL_TOP_VISIBLE_CLASS, shouldShow);
}

export function initScrollTopButton() {
  if (getButton()) {
    return;
  }

  const button = document.createElement('button');
  button.id = SCROLL_TOP_BUTTON_ID;
  button.type = 'button';
  applyHostTooltip(button, 'Ir arriba', { placement: 'right' });
  button.setAttribute('aria-label', 'Ir arriba');

  button.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  document.body.appendChild(button);

  const onScroll = () => syncButtonVisibility(button);
  onScroll();

  window.addEventListener('scroll', onScroll, { passive: true });
}
