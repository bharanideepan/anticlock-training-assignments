import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { RoleName } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { FilesService } from './files.service';
import { UploadUrlRequestDto } from './dto/upload-url-request.dto';
import { ConfirmUploadDto } from './dto/confirm-upload.dto';
import { FileFilterDto } from './dto/file-filter.dto';

@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('upload-url')
  requestUploadUrl(@Body() dto: UploadUrlRequestDto, @Request() req: any) {
    return this.filesService.requestUploadUrl(dto, req.user.sub);
  }

  @Post('confirm')
  confirmUpload(@Body() dto: ConfirmUploadDto) {
    return this.filesService.confirmUpload(dto);
  }

  @Get()
  findAll(@Query() filter: FileFilterDto) {
    return this.filesService.findAll(filter);
  }

  @Get(':id/download-url')
  getDownloadUrl(@Param('id') id: string, @Request() req: any) {
    return this.filesService.getDownloadUrl(id, req.user.sub);
  }

  @Delete(':id')
  @Roles(
    RoleName.SYSTEM_ADMINISTRATOR,
    RoleName.SALES_MANAGER,
    RoleName.SALES_REPRESENTATIVE,
    RoleName.SUPPORT_REPRESENTATIVE,
  )
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @Request() req: any) {
    const role = req.user.role as RoleName;
    const isAdmin =
      role === RoleName.SYSTEM_ADMINISTRATOR || role === RoleName.SALES_MANAGER;
    return this.filesService.remove(id, req.user.sub, isAdmin);
  }
}
