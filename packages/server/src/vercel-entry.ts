import type { IncomingMessage, ServerResponse } from 'node:http';
import app from './app.js';

export const config = {
  runtime: 'nodejs',
};

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  // Convert Node.js IncomingMessage to Web Request
  const proto = req.headers['x-forwarded-proto'] ?? 'https';
  const host = req.headers['x-forwarded-host'] ?? req.headers['host'] ?? 'localhost';
  const url = new URL(req.url ?? '/', `${proto}://${host}`);

  // Read the body
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(chunk as Buffer);
  }
  const body = Buffer.concat(chunks);

  const webReq = new Request(url.toString(), {
    method: req.method,
    headers: Object.entries(req.headers).reduce((h, [k, v]) => {
      if (v) h.set(k, Array.isArray(v) ? v.join(', ') : v);
      return h;
    }, new Headers()),
    body: ['GET', 'HEAD'].includes(req.method ?? 'GET') ? undefined : body,
  });

  const webRes = await app.fetch(webReq);

  // Convert Web Response back to Node.js response
  res.writeHead(webRes.status, Object.fromEntries(webRes.headers.entries()));
  const resBody = await webRes.arrayBuffer();
  res.end(Buffer.from(resBody));
}
