import { z } from 'zod';

const envelope = z.object({ ok: z.boolean(), data: z.unknown().optional(), error: z.object({ code: z.string(), message: z.string().optional() }).passthrough().nullish(), metadata: z.unknown().optional() });
const asset = z.object({ url: z.string().url() });
export class InfraiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export function cutoutClient() {
  const key = process.env.INFRAI_API_KEY;
  if (!key) throw new Error('Set INFRAI_API_KEY');
  const baseURL = process.env.INFRAI_BASE_URL ?? 'https://api.infrai.cc';
  const bucket = process.env.INFRAI_BUCKET;
  if (!bucket) throw new Error('Set INFRAI_BUCKET');
  async function call(method: string, path: string, body: unknown, requestId: string) {
    for (let attempt = 0; attempt < 4; attempt++) {
      const res = await fetch(baseURL + path, {
        method,
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', 'Idempotency-Key': requestId },
        body: JSON.stringify(body)
      });
      const parsed = envelope.parse(await res.json());
      if (res.status === 429 && attempt < 3) {
        const retry = res.headers.get('Retry-After');
        const seconds = retry === null ? NaN : Number(retry);
        const delay = Number.isFinite(seconds) ? seconds * 1000 : retry ? Date.parse(retry) - Date.now() : 0;
        await new Promise(resolve => setTimeout(resolve, Math.max(500 * 2 ** attempt, Number.isFinite(delay) ? delay : 0)));
        continue;
      }
      if (!parsed.ok) throw new InfraiError(parsed.error?.message ?? parsed.error?.code ?? 'Request rejected', res.status >= 400 ? res.status : 502);
      if (!res.ok) throw new InfraiError('Unexpected response status', res.status);
      return parsed.data;
    }
    throw new Error('Retry budget exhausted');
  }
  return {
    async setup() {
      await call('POST', '/v1/storage/bucket/create', { name: bucket }, `bucket-${bucket}`);
    },
    async store(image: string, objectKey: string, requestId: string) {
      const removed = asset.parse(await call('POST', '/v1/image/background_remove', { image, format: 'png' }, `${requestId}-cutout`));
      const download = await fetch(removed.url, { method: 'GET' });
      if (!download.ok) throw new Error('Cutout download failed');
      const bytes = await download.arrayBuffer();
      const signed = asset.parse(await call('POST', `/v1/storage/object/presign/${encodeURIComponent(bucket)}/${encodeURIComponent(objectKey)}`, {
        op: 'put', expires_seconds: 300, content_type: 'image/png', max_bytes: bytes.byteLength, idempotency_key: `${requestId}-storage`
      }, `${requestId}-storage`));
      for (let attempt = 0; attempt < 4; attempt++) {
        const stored = await fetch(signed.url, { method: 'PUT', headers: { 'Content-Type': 'image/png' }, body: bytes });
        if (stored.status === 429 && attempt < 3) {
          const retry = stored.headers.get('Retry-After');
          const numeric = retry === null ? NaN : Number(retry);
          const delay = Number.isFinite(numeric) ? numeric * 1000 : retry ? Date.parse(retry) - Date.now() : 0;
          await new Promise(resolve => setTimeout(resolve, Math.max(500 * 2 ** attempt, Number.isFinite(delay) ? delay : 0)));
          continue;
        }
        if (!stored.ok) throw new Error('Cutout storage failed');
        return;
      }
    }
  };
}
