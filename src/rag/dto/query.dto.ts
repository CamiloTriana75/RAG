import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class QueryDto {
  @ApiProperty({
    example: '¿Qué dice el documento sobre las penalizaciones?',
    description: 'Pregunta a responder basándose en los documentos indexados',
  })
  @IsString()
  @MinLength(3)
  question: string;
}
