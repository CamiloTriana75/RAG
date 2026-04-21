import { IsArray, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class QueryDto {
  @ApiProperty({
    example: '¿Qué dice el documento sobre las penalizaciones?',
    description: 'Pregunta a responder basándose en los documentos indexados',
  })
  @IsString()
  @MinLength(3)
  question: string;

  @ApiProperty({
    required: false,
    type: [String],
    format: 'uuid',
    description:
      'Opcional. Si se envía, limita la búsqueda RAG únicamente a estos documentos del usuario autenticado.',
    example: ['6f8f7d7b-8e4d-4d7f-a4fd-36a7dcb24fca'],
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  documentIds?: string[];

  @ApiProperty({
    required: false,
    description:
      'Instrucción adicional que guía el estilo y formato de la respuesta del LLM (e.g. "Genera un resumen ejecutivo", "Extrae campos en tabla").',
    example: 'Elabora un resumen ejecutivo con viñetas.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1800)
  systemHint?: string;
}
