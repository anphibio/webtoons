export async function fetchWithTimeout(
  fetcher: typeof globalThis.fetch,
  input: RequestInfo | URL,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const forwardAbort = () => controller.abort();
  init.signal?.addEventListener("abort", forwardAbort, { once: true });
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_resolve, reject) => {
    timeout = setTimeout(() => {
      controller.abort();
      reject(new Error("Requisição excedeu o tempo limite"));
    }, timeoutMs);
  });

  try {
    return await Promise.race([
      fetcher(input, { ...init, signal: controller.signal }),
      deadline,
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
    init.signal?.removeEventListener("abort", forwardAbort);
  }
}
