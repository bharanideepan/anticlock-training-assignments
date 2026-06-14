import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

interface MetricEntry {
  count: number;
  totalMs: number;
  errors: number;
}

const registry = new Map<string, MetricEntry>();
let requestTotal = 0;
let errorTotal = 0;
const startTime = Date.now();

function key(method: string, status: number): string {
  const bucket = status < 400 ? '2xx-3xx' : status < 500 ? '4xx' : '5xx';
  return `${method}_${bucket}`;
}

export function getMetricsText(): string {
  const uptimeSec = Math.floor((Date.now() - startTime) / 1000);
  const lines: string[] = [
    '# HELP http_requests_total Total HTTP requests',
    '# TYPE http_requests_total counter',
    `http_requests_total ${requestTotal}`,
    '',
    '# HELP http_errors_total Total HTTP errors (4xx + 5xx)',
    '# TYPE http_errors_total counter',
    `http_errors_total ${errorTotal}`,
    '',
    '# HELP process_uptime_seconds Process uptime in seconds',
    '# TYPE process_uptime_seconds gauge',
    `process_uptime_seconds ${uptimeSec}`,
    '',
    '# HELP nodejs_heap_used_bytes Node.js heap used',
    '# TYPE nodejs_heap_used_bytes gauge',
    `nodejs_heap_used_bytes ${process.memoryUsage().heapUsed}`,
    '',
    '# HELP http_request_duration_ms_sum Sum of request durations',
    '# TYPE http_request_duration_ms_sum counter',
  ];

  for (const [k, v] of registry.entries()) {
    lines.push(`http_request_duration_ms_sum{route="${k}"} ${v.totalMs}`);
  }

  lines.push('');
  lines.push('# HELP http_request_duration_ms_count Request count per route');
  lines.push('# TYPE http_request_duration_ms_count counter');
  for (const [k, v] of registry.entries()) {
    lines.push(`http_request_duration_ms_count{route="${k}"} ${v.count}`);
  }

  return lines.join('\n') + '\n';
}

@Injectable()
export class MetricsMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const start = Date.now();
    requestTotal++;

    res.on('finish', () => {
      const ms = Date.now() - start;
      const k = key(req.method, res.statusCode);
      const entry = registry.get(k) ?? { count: 0, totalMs: 0, errors: 0 };
      entry.count++;
      entry.totalMs += ms;
      if (res.statusCode >= 400) {
        entry.errors++;
        errorTotal++;
      }
      registry.set(k, entry);
    });

    next();
  }
}
