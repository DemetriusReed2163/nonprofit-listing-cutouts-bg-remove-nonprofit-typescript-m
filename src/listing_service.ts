import { createServer } from 'node:http';
import { z } from 'zod';
import { cutoutClient, InfraiError } from './cutout_client.ts';
import { listingBody, listingRecord } from './listing_policy.ts';

const client = cutoutClient();
if (process.argv[2] === 'setup') {
  await client.setup();
  console.log('Listing bucket provisioned');
} else {
  createServer(async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    if (req.method !== 'POST' || req.url !== '/listings') {
      res.writeHead(404).end(JSON.stringify({ error: 'Use POST /listings' }));
      return;
    }
    try {
      const chunks: Buffer[] = [];
      let size = 0;
      for await (const chunk of req) {
        size += chunk.length;
        if (size > 16384) { res.writeHead(413).end(JSON.stringify({ error: 'Request too large' })); return; }
        chunks.push(Buffer.from(chunk));
      }
      const input = listingBody.parse(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      const objectKey = `${input.campaignId}-${input.listingId}.png`;
      await client.store(input.image, objectKey, input.listingId);
      res.writeHead(201).end(JSON.stringify(listingRecord(input, objectKey)));
    } catch (error) {
      const status = error instanceof z.ZodError || error instanceof SyntaxError ? 400 : error instanceof InfraiError ? (error.status < 500 ? error.status : 502) : 502;
      res.writeHead(status).end(JSON.stringify({ error: error instanceof InfraiError ? error.message : status === 400 ? 'Invalid listing body' : 'Listing processing failed' }));
    }
  }).listen(3000, '127.0.0.1', () => console.log('Listing service: http://127.0.0.1:3000'));
}
