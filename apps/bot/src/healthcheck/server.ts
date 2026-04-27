import { createServer, type Server } from 'node:http';

interface HealthcheckOptions {
  readonly port: number;
  readonly isReady: () => boolean;
}

/**
 * Minimal HTTP server exposing /healthz for Docker/k8s readiness probes.
 *
 * - 200 with `{ ready: true }` when the bot is logged in and the gateway
 *   reports OPEN status.
 * - 503 otherwise — Docker will mark the container unhealthy, which can
 *   trigger restart depending on the orchestrator's restart policy.
 */
export function startHealthcheck({ port, isReady }: HealthcheckOptions): Promise<Server> {
  return new Promise((resolve, reject) => {
    const server = createServer((req, res) => {
      if (req.url === '/healthz') {
        const ready = isReady();
        res.writeHead(ready ? 200 : 503, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ready }));
        return;
      }
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'not_found' }));
    });

    server.once('error', reject);
    server.listen(port, () => {
      console.log(`[healthcheck] listening on :${port}/healthz`);
      resolve(server);
    });
  });
}
