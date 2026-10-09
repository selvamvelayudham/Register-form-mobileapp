import { NativeModules } from 'react-native';

export const API_URL = 'https://shreeswayam.tech/api';
export type Auth = {
  token?: string;
  communityId?: string;
  receiptToken?: string;
};
export function headers(auth: Auth = {}) {
  return {
    'Content-Type': 'application/json',
    ...(auth.token ? { Authorization: `Bearer ${auth.token}` } : {}),
    ...(auth.communityId ? { 'X-Community-Id': auth.communityId } : {}),
    ...(auth.receiptToken ? { 'X-Receipt-Token': auth.receiptToken } : {}),
  };
}
export function query(params: Record<string, any>) {
  return Object.entries(params)
    .filter(([, v]) => v !== '' && v != null)
    .map(
      ([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`,
    )
    .join('&');
}
export async function api(
  path: string,
  auth: Auth = {},
  method = 'GET',
  body?: any,
  signal?: AbortSignal,
) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal?.addEventListener('abort', abort);
  if (signal?.aborted) controller.abort();
  const timeout = setTimeout(abort, 30000);
  try {
    const response = await fetch(`${API_URL}${path}`, {
      method,
      headers: headers(auth),
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      signal: controller.signal,
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || result.success === false)
      throw new Error(
        result.message ||
          `Request failed (${response.status}). Please try again.`,
      );
    if (!('data' in result))
      throw new Error(
        'The server returned an unexpected response. Please try again.',
      );
    return result.data;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', abort);
  }
}
export async function download(
  path: string,
  filename: string,
  auth: Auth = {},
) {
  return NativeModules.SangamDevice.saveDownload(
    `${API_URL}${path}`,
    filename.replace(/[<>:"/\\|?*\x00-\x1f]/g, '-'),
    headers(auth),
  );
}
export const sessionStore = {
  read: () => NativeModules.SangamDevice.readSession(),
  save: (value: any) =>
    NativeModules.SangamDevice.saveSession(JSON.stringify(value)),
  clear: () => NativeModules.SangamDevice.clearSession(),
};
