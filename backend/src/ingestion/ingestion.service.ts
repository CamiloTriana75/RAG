import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class IngestionService {
  private readonly logger = new Logger(IngestionService.name);
  private readonly chunkSize: number;
  private readonly chunkOverlap: number;

  constructor(private readonly configService: ConfigService) {
    this.chunkSize = this.configService.get<number>('CHUNK_SIZE', 1000);
    this.chunkOverlap = this.configService.get<number>('CHUNK_OVERLAP', 200);
  }

  /**
   * Extract text from a file based on its mime type
   */
  async extractText(filePath: string, mimeType: string): Promise<string> {
    const absolutePath = path.resolve(filePath);

    if (!fs.existsSync(absolutePath)) {
      throw new Error(`File not found: ${absolutePath}`);
    }

    switch (mimeType) {
      case 'application/pdf':
        return this.extractFromPdf(absolutePath);

      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        return this.extractFromDocx(absolutePath);

      case 'text/markdown':
      case 'text/plain':
        return this.extractFromText(absolutePath);
        
      case 'text/csv':
      case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
      case 'application/vnd.ms-excel':
        return this.extractFromSpreadsheet(absolutePath);

      default:
        throw new Error(`Unsupported mime type: ${mimeType}`);
    }
  }

  /**
   * Split text into overlapping chunks using recursive character splitting
   */
  splitIntoChunks(text: string): string[] {
    const chunks: string[] = [];

    // Clean the text
    const cleanText = text
      .replace(/\r\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    if (cleanText.length <= this.chunkSize) {
      return [cleanText];
    }

    // Separators ordered by priority (paragraph > sentence > word)
    const separators = ['\n\n', '\n', '. ', ', ', ' '];

    let start = 0;

    while (start < cleanText.length) {
      let end = start + this.chunkSize;

      if (end >= cleanText.length) {
        chunks.push(cleanText.slice(start).trim());
        break;
      }

      // Try to find the best split point using separators
      let splitAt = -1;
      for (const sep of separators) {
        const lastIndex = cleanText.lastIndexOf(sep, end);
        if (lastIndex > start && lastIndex > start + this.chunkSize / 2) {
          splitAt = lastIndex + sep.length;
          break;
        }
      }

      if (splitAt === -1) {
        splitAt = end; // Hard split if no good separator found
      }

      const chunk = cleanText.slice(start, splitAt).trim();
      if (chunk.length > 0) {
        chunks.push(chunk);
      }

      // Advance with overlap
      start = splitAt - this.chunkOverlap;
      if (start < 0) start = 0;
      // Prevent infinite loop
      if (start >= splitAt) start = splitAt;
    }

    return chunks;
  }

  // ── Private text extractors ────────────────────────

  private async extractFromPdf(filePath: string): Promise<string> {
    const pdfParse = require('pdf-parse');
    const buffer = fs.readFileSync(filePath);
    const data = await pdfParse(buffer);
    return data.text;
  }

  private async extractFromDocx(filePath: string): Promise<string> {
    const mammoth = await import('mammoth');
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value;
  }

  private async extractFromText(filePath: string): Promise<string> {
    return fs.readFileSync(filePath, 'utf-8');
  }

  private async extractFromSpreadsheet(filePath: string): Promise<string> {
    const XLSX = require('xlsx');
    const workbook = XLSX.readFile(filePath);
    let extractedText = '';

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const csvData = XLSX.utils.sheet_to_csv(sheet);
      // Evitamos añadir texto en blanco si la hoja está vacía
      if (csvData.trim().length > 0) {
        extractedText += `--- Hoja: ${sheetName} ---\n${csvData}\n\n`;
      }
    }

    return extractedText.trim();
  }
}
