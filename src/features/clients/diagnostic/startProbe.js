export async function probeDiagnosticStart(executionPromise) {
  let immediateError = null;

  executionPromise.catch((error) => {
    immediateError = error;
  });

  await Promise.resolve();

  if (immediateError) {
    return {
      started: false,
      error: immediateError,
    };
  }

  return {
    started: true,
    error: null,
  };
}
