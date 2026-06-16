import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// Stub — full implementation in WU-003
@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {
    void this.prisma;
  }

  async validateUser(
    _email: string,
    _password: string,
  ): Promise<Record<string, unknown> | null> {
    return null;
  }
}
