import { Injectable } from '@nestjs/common';

export interface HealthResponse {
  message: string;
}

@Injectable()
export class AppService {
  getHealth(): HealthResponse {
    return { message: 'CRM API is running' };
  }
}
