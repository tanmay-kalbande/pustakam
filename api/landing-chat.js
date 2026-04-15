import { Readable } from 'node:stream';

const SSE_HEADERS = {
  'Cache-Control': 'no-cache',
  Connection: 'keep-alive',
  'Content-Type': 'text/event-stream',
  'X-Accel-Buffering': 'no',
};

function getProxyBaseUrl() {
  const rawValue = (
    process.env.LANDING_CHAT_PROXY_URL ||
    process.env.VITE_PROXY_URL ||
    ''
  ).trim();

  return rawValue.replace(/\/+$/, '');
}

async function readJsonBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;

  let raw = '';
  for await (const chunk of req) {
    raw += typeof chunk === 'string' ? chunk : chunk.toString('utf8');
  }

  if (!raw.trim()) return {};

  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function sendJsonError(res, statusCode, error) {
  res.status(statusCode).json({ error });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return sendJsonError(res, 405, 'Method not allowed');
  }

  const proxyBaseUrl = getProxyBaseUrl();
  if (!proxyBaseUrl) {
    return sendJsonError(res, 500, 'Landing chat relay is missing proxy configuration.');
  }

  const requestBody = await readJsonBody(req);
  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), 45000);

  const abortRelay = () => abortController.abort();
  req.on('close', abortRelay);
  req.on('aborted', abortRelay);

  let upstreamResponse;
  try {
    upstreamResponse = await fetch(`${proxyBaseUrl}/api/landing-chat`, {
      method: 'POST',
      headers: {
        Accept: 'text/event-stream',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      signal: abortController.signal,
    });
  } catch (error) {
    clearTimeout(timeoutId);
    req.removeListener('close', abortRelay);
    req.removeListener('aborted', abortRelay);

    const message = error instanceof Error ? error.message : 'Unable to reach landing chat proxy.';
    return sendJsonError(res, 502, message);
  }

  clearTimeout(timeoutId);
  req.removeListener('close', abortRelay);
  req.removeListener('aborted', abortRelay);

  if (!upstreamResponse.ok) {
    const errorText = await upstreamResponse.text().catch(() => upstreamResponse.statusText);

    try {
      const parsed = JSON.parse(errorText);
      return sendJsonError(
        res,
        upstreamResponse.status,
        parsed?.error || parsed?.message || errorText || 'Landing chat relay failed.',
      );
    } catch {
      return sendJsonError(
        res,
        upstreamResponse.status,
        errorText || 'Landing chat relay failed.',
      );
    }
  }

  if (!upstreamResponse.body) {
    return sendJsonError(res, 502, 'Landing chat relay received an empty stream.');
  }

  Object.entries(SSE_HEADERS).forEach(([key, value]) => {
    res.setHeader(key, value);
  });
  res.flushHeaders?.();

  const upstreamStream = Readable.fromWeb(upstreamResponse.body);

  upstreamStream.on('error', error => {
    if (res.writableEnded) return;

    const message = error instanceof Error ? error.message : 'Landing chat relay stream failed.';
    try {
      res.write(`event: error\ndata: ${JSON.stringify({ error: message })}\n\n`);
    } catch {}

    try {
      res.end();
    } catch {}
  });

  upstreamStream.pipe(res);
}
