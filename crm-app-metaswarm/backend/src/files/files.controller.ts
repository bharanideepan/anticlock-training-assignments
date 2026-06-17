import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ResourceType, RoleName } from '@prisma/client';
import { FilesService } from './files.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UploadUrlDto } from './dto/upload-url.dto';
import { ConfirmUploadDto } from './dto/confirm-upload.dto';

interface ActorPayload {
  sub: string;
  email: string;
  role: RoleName;
  teamIds: string[];
}

const ALL_ROLES = [
  RoleName.SYSTEM_ADMINISTRATOR,
  RoleName.SALES_MANAGER,
  RoleName.SALES_REPRESENTATIVE,
  RoleName.SUPPORT_REPRESENTATIVE,
  RoleName.READ_ONLY,
];

const WRITE_ROLES = [
  RoleName.SYSTEM_ADMINISTRATOR,
  RoleName.SALES_MANAGER,
  RoleName.SALES_REPRESENTATIVE,
  RoleName.SUPPORT_REPRESENTATIVE,
];

@ApiTags('files')
@Controller('files')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('upload-url')
  @HttpCode(HttpStatus.OK)
  @Roles(...WRITE_ROLES)
  async requestUploadUrl(
    @Body() dto: UploadUrlDto,
    @CurrentUser() actor: ActorPayload,
  ): Promise<{ data: unknown }> {
    const result = await this.filesService.requestUploadUrl(dto, actor.sub, actor.role, actor.teamIds);
    return { data: result };
  }

  @Post('confirm')
  @HttpCode(HttpStatus.OK)
  @Roles(...WRITE_ROLES)
  async confirmUpload(
    @Body() dto: ConfirmUploadDto,
    @CurrentUser() actor: ActorPayload,
  ): Promise<{ data: unknown }> {
    const file = await this.filesService.confirmUpload(dto.fileId, actor.sub);
    return { data: file };
  }

  @Get()
  @Roles(...ALL_ROLES)
  async listFiles(
    @Query() query: { resourceType: string; resourceId: string },
  ): Promise<{ data: unknown[] }> {
    const data = await this.filesService.listFiles(query.resourceType as ResourceType, query.resourceId);
    return { data };
  }

  @Get(':id/download-url')
  @Roles(...ALL_ROLES)
  async getDownloadUrl(
    @Param('id') id: string,
    @CurrentUser() actor: ActorPayload,
  ): Promise<{ data: unknown }> {
    const result = await this.filesService.getDownloadUrl(id, actor.sub, actor.role, actor.teamIds);
    return { data: result };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(...WRITE_ROLES)
  async remove(@Param('id') id: string, @CurrentUser() actor: ActorPayload): Promise<void> {
    await this.filesService.remove(id, actor.sub, actor.role, actor.teamIds);
  }
}
