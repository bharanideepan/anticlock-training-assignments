import { Params } from 'nestjs-pino';

export const loggerConfig: Params = {
  pinoHttp: {
    level: process.env.LOG_LEVEL ?? 'info',
    transport:
      process.env.NODE_ENV !== 'production'
        ? {
            target: 'pino-pretty',
            options: { colorize: true, singleLine: true },
          }
        : undefined,
    serializers: {
      req(req: { method: string; url: string }) {
        return { method: req.method, url: req.url };
      },
    },
    customProps: (req: any) => ({
      traceId: req.headers?.['x-trace-id'] ?? crypto.randomUUID(),
      userId: req.user?.sub ?? null,
    }),
    customSuccessMessage(req: { method: string }, res: { statusCode: number }) {
      return `${req.method} ${res.statusCode}`;
    },
  } as any,
};
