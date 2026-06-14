import { Controller, Get, Header, Res } from '@nestjs/common';
import { Response } from 'express';
import {
  HealthCheck,
  HealthCheckService,
  PrismaHealthIndicator,
} from '@nestjs/terminus';
import { PrismaService } from '../../prisma/prisma.service';
import { Public } from '../../common/decorators/public.decorator';
import { getMetricsText } from '../../common/middleware/metrics.middleware';

@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly prismaHealth: PrismaHealthIndicator,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  @Public()
  liveness() {
    return { status: 'ok' };
  }

  @Get('ready')
  @Public()
  @HealthCheck()
  readiness() {
    return this.health.check([
      () => this.prismaHealth.pingCheck('database', this.prisma),
    ]);
  }

  @Get('metrics')
  @Public()
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  metrics(@Res() res: Response) {
    res.send(getMetricsText());
  }
}
