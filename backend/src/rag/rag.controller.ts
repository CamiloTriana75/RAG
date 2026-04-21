import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RagService } from './rag.service';
import { QueryDto } from './dto/query.dto';

@ApiTags('RAG')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('rag')
export class RagController {
  constructor(private readonly ragService: RagService) {}

  @Post('query')
  @ApiOperation({
    summary: 'Hacer una pregunta sobre tus documentos',
    description:
      'Busca semánticamente en los documentos indexados del usuario y genera una respuesta usando IA.',
  })
  @ApiResponse({
    status: 200,
    description: 'Respuesta generada con fuentes citadas',
    schema: {
      example: {
        answer: 'Según el documento contrato.pdf, las penalizaciones aplican cuando...',
        sources: [
          {
            documentId: 'uuid-here',
            documentName: 'contrato.pdf',
            chunkContent: 'Las penalizaciones por incumplimiento...',
            chunkIndex: 3,
            similarity: 0.923,
          },
        ],
        processingTime: 2340,
      },
    },
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async query(
    @Body() dto: QueryDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.ragService.query(dto.question, user.id, {
      documentIds: dto.documentIds,
    });
  }
}
