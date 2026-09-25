import type { JoinResponse, UploadTicket } from '@storyloom/protocol';

// The API address is injected at deploy time as /config.json, so one build
// works in every environment. NEXT_PUBLIC_API_BASE_URL overrides it for local dev.
let apiBase = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, '') ?? '';
let loaded = !!apiBase;

export async function loadConfig() {
  if (loaded) return;
  loaded = true;
  try {
    const res = await fetch('/config.json', { cache: 'no-store' });
    if (res.ok) {
      const cfg = (await res.json()) as { apiBaseUrl?: string };
      apiBase = cfg.apiBaseUrl?.replace(/\/$/, '') ?? '';
    }
  } catch {
    /* preview mode */
  }
}

export const isPreviewMode = () => !apiBase;

async function call<T>(path: string, init: RequestInit & { token?: string } = {}): Promise<T> {
  const res = await fetch(`${apiBase}${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(init.token ? { authorization: `Bearer ${init.token}` } : {}),
      ...init.headers,
    },
  });
  if (!res.ok) {
    let message = `Something went wrong (${res.status})`;
    try {
      const body = await res.json();
      if (body?.message) message = body.message;
    } catch {
      /* keep default */
    }
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

export function joinRoom(code: string, name: string, color: string) {
  return call<JoinResponse>(`/rooms/${encodeURIComponent(code)}/join`, {
    method: 'POST',
    body: JSON.stringify({ name, color }),
  });
}

export function requestUpload(roomId: string, token: string) {
  return call<UploadTicket>(`/rooms/${roomId}/drawings`, { method: 'POST', token, body: '{}' });
}

export async function uploadDrawing(ticket: UploadTicket, blob: Blob) {
  if (blob.size > ticket.maxBytes) throw new Error('That photo is too large. Try again a little further away.');
  const form = new FormData();
  Object.entries(ticket.fields).forEach(([k, v]) => form.append(k, v));
  form.append('file', blob, 'drawing.jpg'); // S3 requires the file to be the last field
  const res = await fetch(ticket.url, { method: 'POST', body: form });
  if (!res.ok) throw new Error('Upload failed. Please try again.');
}

export function submitHero(roomId: string, token: string, key: string, name: string) {
  return call<{ ok: true }>(`/rooms/${roomId}/hero`, { method: 'POST', token, body: JSON.stringify({ key, name }) });
}
