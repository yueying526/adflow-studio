import { getAppConfig } from './config';

export async function triggerN8n(pathname, params = {}, options = {}) {
  const { n8nBaseUrl } = getAppConfig();
  const url = new URL(`${n8nBaseUrl}/webhook/${pathname}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
  }

  const controller = new AbortController();
  const timeout = options.timeoutMs ? setTimeout(() => controller.abort(), options.timeoutMs) : null;
  try {
    const response = await fetch(url, { signal: controller.signal, cache: 'no-store' });
    const text = await response.text();
    if (!response.ok) throw new Error(`n8n webhook ${pathname} failed: ${text.slice(0, 500)}`);
    try {
      return text ? JSON.parse(text) : {};
    } catch {
      return { message: text };
    }
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

export function triggerN8nInBackground(pathname, params = {}) {
  triggerN8n(pathname, params).catch((error) => {
    console.error(`[n8n background] ${pathname}`, error);
  });
}
