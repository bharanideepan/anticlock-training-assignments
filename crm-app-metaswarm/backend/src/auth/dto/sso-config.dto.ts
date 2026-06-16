import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsObject } from 'class-validator';
import { SsoProvider } from '@prisma/client';

export class SsoConfigDto {
  @ApiProperty({ enum: SsoProvider })
  @IsEnum(SsoProvider)
  provider: SsoProvider;

  @ApiProperty()
  @IsBoolean()
  isActive: boolean;

  @ApiProperty({
    example: {
      entryPoint: 'https://idp.example.com/saml/login',
      issuer: 'crm-app',
      cert: '<base64-encoded-cert>',
    },
  })
  @IsObject()
  config: Record<string, unknown>;
}
