import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseUUIDPipe,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage, memoryStorage } from 'multer';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  DocumentsService,
  type ExtractedInfoResponse,
} from './documents.service';

const ALLOWED_MIMETYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/markdown',
  'text/plain',
  'text/csv',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
];

@ApiTags('Documents')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post('upload')
  @ApiOperation({ summary: 'Subir documento (PDF, DOCX, MD, CSV, XLS, XLSX)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Documento subido y encolado para procesamiento' })
  @ApiResponse({ status: 400, description: 'Tipo de archivo no soportado' })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 50 * 1024 * 1024 },
      fileFilter: (_req, file, callback) => {
        if (ALLOWED_MIMETYPES.includes(file.mimetype)) {
          callback(null, true);
        } else {
          callback(
            new BadRequestException(
              `Tipo de archivo no soportado: ${file.mimetype}. Permitidos: PDF, DOCX, MD, TXT, CSV, XLS, XLSX`,
            ),
            false,
          );
        }
      },
    }),
  )
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: { id: string },
  ) {
    if (!file) {
      throw new BadRequestException('No se proporcionó ningún archivo');
    }
    return this.documentsService.upload(file, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Listar documentos del usuario' })
  @ApiResponse({ status: 200, description: 'Lista de documentos' })
  async findAll(@CurrentUser() user: { id: string }) {
    return this.documentsService.findAllByUser(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Ver detalle de un documento' })
  @ApiResponse({ status: 200, description: 'Detalle del documento con estado de procesamiento' })
  @ApiResponse({ status: 404, description: 'Documento no encontrado' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.documentsService.findOneByUser(id, user.id);
  }

  @Get(':id/extracted-info')
  @ApiOperation({ summary: 'Ver informacion extraida del documento' })
  @ApiResponse({ status: 200, description: 'Resumen de contenido extraido y fragmentos de vista previa' })
  @ApiResponse({ status: 404, description: 'Documento no encontrado' })
  async extractedInfo(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string },
  ): Promise<ExtractedInfoResponse> {
    return this.documentsService.getExtractedInfoByUser(id, user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar documento y sus chunks' })
  @ApiResponse({ status: 200, description: 'Documento eliminado' })
  @ApiResponse({ status: 404, description: 'Documento no encontrado' })
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string },
  ) {
    await this.documentsService.deleteByUser(id, user.id);
    return { message: 'Documento eliminado exitosamente' };
  }
}
