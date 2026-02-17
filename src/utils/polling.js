const DEFAULT_INTERVAL = 500;
const DEFAULT_TIMEOUT = 30000;

export function waitForElement(selector, options = {}) {
  const { interval = DEFAULT_INTERVAL, timeout = DEFAULT_TIMEOUT } = options;

  return new Promise((resolve) => {
    const check = setInterval(() => {
      const el = document.querySelector(selector);
      if (el) {
        clearInterval(check);
        resolve(el);
      }
    }, interval);

    setTimeout(() => {
      clearInterval(check);
      resolve(null);
    }, timeout);
  });
}

export function waitForCondition(conditionFn, options = {}) {
  const { interval = DEFAULT_INTERVAL, timeout = DEFAULT_TIMEOUT } = options;

  return new Promise((resolve) => {
    const check = setInterval(() => {
      const result = conditionFn();
      if (result) {
        clearInterval(check);
        resolve(result);
      }
    }, interval);

    setTimeout(() => {
      clearInterval(check);
      resolve(null);
    }, timeout);
  });
}
