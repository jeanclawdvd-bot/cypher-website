#!/usr/bin/env node
/**
 * Local CRM stand-in for verifying the ZODE compute-lead funnel end-to-end
 * before a real webhook (Zapier/Slack/HubSpot) is wired.
 *
 * Usage:
 *   node scripts/lead-webhook-receiver.mjs           # listens on :4000
 *   PORT=5000 node scripts/lead-webhook-receiver.mjs # custom port
 *
 * Then point the app at it and run the dev server:
 *   ZODE_LEADS_WEBHOOK_URL=http://localhost:4000 npm run dev
 *
 * Submit a form on /buy-compute or /give-compute and watch the lead print here.
 * Received leads are also appended to scripts/leads.local.jsonl (gitignored) so
 * you have a durable record while testing.
 */
import { createServer } from 'node:http';
import { appendFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const port = Number(process.env.PORT ?? 4000);
const logFile = join(dirname(fileURLToPath(import.meta.url)), 'leads.local.jsonl');

const server = createServer((req, res) => {
  if (req.method !== 'POST') {
    res.writeHead(405).end('POST only');
    return;
  }

  let body = '';
  req.on('data', (chunk) => {
    body += chunk;
  });
  req.on('end', async () => {
    let parsed;
    try {
      parsed = JSON.parse(body);
    } catch {
      console.error('⚠️  Received non-JSON body:', body);
      res.writeHead(400).end('bad json');
      return;
    }

    const stamp = new Date().toISOString();
    console.log(`\n✅ LEAD RECEIVED  ${stamp}`);
    console.log(`   ${parsed.summary ?? '(no summary)'}`);
    console.dir(parsed, { depth: null, colors: true });

    try {
      await appendFile(logFile, JSON.stringify({ receivedAt: stamp, ...parsed }) + '\n');
    } catch (err) {
      console.error('   (could not append to log file)', err);
    }

    res.writeHead(200, { 'content-type': 'application/json' }).end('{"ok":true}');
  });
});

server.listen(port, () => {
  console.log(`Lead webhook receiver listening on http://localhost:${port}`);
  console.log(`Point the app at it:  ZODE_LEADS_WEBHOOK_URL=http://localhost:${port} npm run dev`);
  console.log(`Leads also logged to: ${logFile}\n`);
});
