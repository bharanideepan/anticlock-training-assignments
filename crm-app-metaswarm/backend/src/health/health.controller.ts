import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

interface HealthStatus {
  data: { status: string };
}

@ApiTags('health')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({ summary: 'Health check', description: 'Returns the health status of the API' })
  @ApiOkResponse({ description: 'Service is healthy', schema: { example: { data: { status: 'ok' } } } })
  check(): HealthStatus {
    return { data: { status: 'ok' } };
  }
}
