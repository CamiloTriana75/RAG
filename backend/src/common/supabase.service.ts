import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as path from 'path';

@Injectable()
export class SupabaseStorageService {
  private readonly logger = new Logger(SupabaseStorageService.name);
  private readonly client: SupabaseClient | null = null;
  private readonly bucketName: string;

  constructor(private readonly configService: ConfigService) {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseKey = this.configService.get<string>('SUPABASE_SERVICE_KEY');
    this.bucketName = this.configService.get<string>('SUPABASE_BUCKET_NAME', 'documents');

    if (supabaseUrl && supabaseKey) {
      this.client = createClient(supabaseUrl, supabaseKey);
      this.logger.log(`📦 Conectado a Supabase Storage: ${supabaseUrl}`);
    } else {
      this.logger.warn(
        '⚠️ SUPABASE_URL o SUPABASE_SERVICE_KEY no configurados. Usando almacenamiento local.',
      );
    }
  }

  isConfigured(): boolean {
    return this.client !== null;
  }

  async uploadFile(
    file: Express.Multer.File,
    userId: string,
  ): Promise<{ filePath: string; url: string }> {
    if (!this.client) {
      throw new Error('Supabase no está configurado');
    }

    const ext = path.extname(file.originalname);
    const fileName = `${userId}/${file.fieldname}${ext}`;

    const { data, error } = await this.client.storage
      .from(this.bucketName)
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (error) {
      this.logger.error(`Error subiendo a Supabase: ${error.message}`);
      throw new Error(`Error al subir archivo: ${error.message}`);
    }

    const { data: urlData } = this.client.storage
      .from(this.bucketName)
      .getPublicUrl(fileName);

    this.logger.log(`📤 Archivo subido a Supabase: ${fileName}`);
    return {
      filePath: fileName,
      url: urlData.publicUrl,
    };
  }

  async deleteFile(filePath: string): Promise<void> {
    if (!this.client) {
      throw new Error('Supabase no está configurado');
    }

    const { error } = await this.client.storage
      .from(this.bucketName)
      .remove([filePath]);

    if (error) {
      this.logger.error(`Error eliminando de Supabase: ${error.message}`);
      throw new Error(`Error al eliminar archivo: ${error.message}`);
    }

    this.logger.log(`🗑️ Archivo eliminado de Supabase: ${filePath}`);
  }

  async downloadFile(filePath: string): Promise<Buffer> {
    if (!this.client) {
      throw new Error('Supabase no está configurado');
    }

    const { data, error } = await this.client.storage
      .from(this.bucketName)
      .download(filePath);

    if (error) {
      this.logger.error(`Error descargando de Supabase: ${error.message}`);
      throw new Error(`Error al descargar archivo: ${error.message}`);
    }

    const arrayBuffer = await data.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }
}