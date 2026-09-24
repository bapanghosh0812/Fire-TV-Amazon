import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export function json(status: number, body: unknown): APIGatewayProxyResultV2 {
  return {
    statusCode: status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
    body: JSON.stringify(body),
  };
}

export function parseBody<T>(event: APIGatewayProxyEventV2, maxBytes = 16_384): T {
  const raw = event.body ? (event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString('utf8') : event.body) : '{}';
  if (raw.length > maxBytes) throw new HttpError(413, 'Request too large');
  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new HttpError(400, 'Invalid JSON');
  }
}

/** Wraps a handler with consistent error responses and structured logs. */
export function handler(fn: (event: APIGatewayProxyEventV2) => Promise<APIGatewayProxyResultV2>) {
  return async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
    try {
      return await fn(event);
    } catch (err) {
      const status = (err as { status?: number }).status ?? 500;
      if (status >= 500) console.error(JSON.stringify({ level: 'error', route: event.routeKey, message: (err as Error).message, stack: (err as Error).stack }));
      return json(status, { message: status >= 500 ? 'Something went wrong on our side. Please try again.' : (err as Error).message });
    }
  };
}

export function clientIp(event: APIGatewayProxyEventV2) {
  return event.requestContext.http.sourceIp;
}

/** Keeps user-provided text short, printable and free of markup. */
export function cleanText(input: unknown, max: number) {
  if (typeof input !== 'string') return '';
  return input
    .replace(/[\u0000-\u001f\u007f<>]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}
