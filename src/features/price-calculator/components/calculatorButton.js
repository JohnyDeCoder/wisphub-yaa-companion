import { CALC_BUTTON_ID } from '../../../config/constants.js';
import { createToolbarButton, injectIntoToolbar, addKeyboardShortcut } from '../../../utils/toolbar.js';
import { calculatePrices } from '../priceCalculator.js';

export function injectCalculatorButton(editor) {
  const btn = createToolbarButton({
    id: CALC_BUTTON_ID,
    label: 'Precios',
    title: 'Calcular precios (Ctrl+Shift+Alt+P)',
    onClick: () => calculatePrices({ silent: false }),
  });

  const injected = injectIntoToolbar(
    editor,
    CALC_BUTTON_ID,
    'wisphub-calc-container',
    btn,
    '.wisphub-formatter-container',
  );

  if (injected) {
    addKeyboardShortcut({ ctrl: true, shift: true, alt: true, key: 'P' }, CALC_BUTTON_ID);
  }

  return injected;
}
