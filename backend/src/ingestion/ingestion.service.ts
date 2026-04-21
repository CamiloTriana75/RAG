import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';

interface SpreadsheetExtractionOptions {
  preferredSheet?: string;
}

@Injectable()
export class IngestionService {
  private readonly logger = new Logger(IngestionService.name);
  private readonly chunkSize: number;
  private readonly chunkOverlap: number;
  private readonly processAllSheetsByDefault: boolean;

  constructor(private readonly configService: ConfigService) {
    this.chunkSize = this.configService.get<number>('CHUNK_SIZE', 1000);
    this.chunkOverlap = this.configService.get<number>('CHUNK_OVERLAP', 200);
    this.processAllSheetsByDefault = this.isEnabled(
      this.configService.get<string>('EXCEL_PROCESS_ALL_SHEETS'),
    );
  }

  /**
   * Extract text from a file based on its mime type
   */
  async extractText(
    filePath: string,
    mimeType: string,
    options: SpreadsheetExtractionOptions = {},
  ): Promise<string> {
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
        return this.extractFromSpreadsheet(absolutePath, options.preferredSheet);

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

  private isEnabled(value: string | boolean | undefined): boolean {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
    }
    return false;
  }

  private normalizeCellValue(cell: unknown): string {
    if (cell === null || cell === undefined) return '';

    if (typeof cell === 'string') return cell;
    if (typeof cell === 'number' || typeof cell === 'boolean') {
      return String(cell);
    }
    if (cell instanceof Date) {
      return cell.toISOString();
    }

    if (typeof cell === 'object') {
      const maybeObject = cell as {
        text?: string;
        result?: unknown;
        richText?: Array<{ text?: string }>;
      };

      if (typeof maybeObject.text === 'string') {
        return maybeObject.text;
      }
      if (maybeObject.result !== undefined && maybeObject.result !== null) {
        return String(maybeObject.result);
      }
      if (Array.isArray(maybeObject.richText)) {
        return maybeObject.richText
          .map((item) => item?.text ?? '')
          .join('');
      }
    }

    return String(cell);
  }

  private escapeCsvCell(value: string): string {
    const shouldQuote = /[",\n]/.test(value);
    const escaped = value.replace(/"/g, '""');
    return shouldQuote ? `"${escaped}"` : escaped;
  }

  private rowValuesToCsv(rowValues: unknown): string {
    if (!Array.isArray(rowValues)) {
      return '';
    }

    return rowValues
      .slice(1)
      .map((cell) => this.escapeCsvCell(this.normalizeCellValue(cell)))
      .join(',')
      .trim();
  }

  private async loadExcelJsModule(): Promise<{
    stream?: { xlsx?: { WorkbookReader?: new (...args: unknown[]) => AsyncIterable<unknown> } };
    Workbook?: new () => { xlsx: { readFile(filePath: string): Promise<void> }; worksheets: Array<{ name?: string; eachRow(cb: (row: { values: unknown[] }) => void): void }> };
  }> {
    const excelJsModule = (await import('exceljs')) as Record<string, unknown>;
    const excelJs = (excelJsModule.default ?? excelJsModule) as {
      stream?: { xlsx?: { WorkbookReader?: new (...args: unknown[]) => AsyncIterable<unknown> } };
      Workbook?: new () => {
        xlsx: { readFile(filePath: string): Promise<void> };
        worksheets: Array<{
          name?: string;
          eachRow(cb: (row: { values: unknown[] }) => void): void;
        }>;
      };
    };

    if (!excelJs || (typeof excelJs !== 'object' && typeof excelJs !== 'function')) {
      throw new Error('exceljs module failed to load');
    }

    return excelJs;
  }

  private async loadXlsxModule(): Promise<{
    readFile(filePath: string): {
      SheetNames: string[];
      Sheets: Record<string, unknown>;
    };
    utils: {
      sheet_to_csv(sheet: unknown): string;
    };
  }> {
    const xlsxModule = (await import('xlsx')) as Record<string, unknown>;
    const xlsx = (xlsxModule.default ?? xlsxModule) as {
      readFile?: (filePath: string) => {
        SheetNames: string[];
        Sheets: Record<string, unknown>;
      };
      utils?: {
        sheet_to_csv?: (sheet: unknown) => string;
      };
    };

    if (!xlsx?.readFile || !xlsx?.utils?.sheet_to_csv) {
      throw new Error('XLSX module failed to load or parse methods are unavailable');
    }

    return {
      readFile: xlsx.readFile,
      utils: {
        sheet_to_csv: xlsx.utils.sheet_to_csv,
      },
    };
  }

  private async extractFromSpreadsheet(
    filePath: string,
    preferredSheet?: string,
  ): Promise<string> {
    const extension = path.extname(filePath).toLowerCase();
    if (extension === '.xls') {
      return this.extractWithXlsxLibrary(filePath, preferredSheet);
    }

    try {
      return await this.extractFromXlsxWithExcelJs(filePath, preferredSheet);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `exceljs parsing failed for ${filePath}. Falling back to xlsx library. Reason: ${errorMsg}`,
      );
      return this.extractWithXlsxLibrary(filePath, preferredSheet);
    }
  }

  private async extractFromXlsxWithExcelJs(
    filePath: string,
    preferredSheet?: string,
  ): Promise<string> {
    const ExcelJS = await this.loadExcelJsModule();
    const WorkbookReader = ExcelJS.stream?.xlsx?.WorkbookReader;

    if (!WorkbookReader) {
      this.logger.warn(
        'exceljs stream reader unavailable; falling back to non-stream workbook loading',
      );

      const Workbook = ExcelJS.Workbook;
      if (!Workbook) {
        throw new Error('exceljs Workbook constructor is unavailable');
      }

      const workbook = new Workbook();
      const readFileMethod = workbook?.xlsx?.readFile;
      if (typeof readFileMethod !== 'function') {
        throw new Error('exceljs workbook.readFile is unavailable');
      }
      await readFileMethod.call(workbook.xlsx, filePath);

      const normalizedSelector = preferredSheet?.trim();
      const targetIndex =
        normalizedSelector && /^\d+$/.test(normalizedSelector)
          ? Number(normalizedSelector)
          : undefined;
      const targetName =
        normalizedSelector && !/^\d+$/.test(normalizedSelector)
          ? normalizedSelector.toLowerCase()
          : undefined;
      const processAll = this.processAllSheetsByDefault && !normalizedSelector;

      const blocks: string[] = [];
      let sheetOrdinal = 0;
      let matchedRequestedSheet = false;

      for (const sheet of workbook.worksheets) {
        sheetOrdinal += 1;
        const sheetName = sheet.name ?? `Sheet${sheetOrdinal}`;
        const matchesByName = targetName
          ? sheetName.toLowerCase() === targetName
          : false;
        const matchesByIndex = targetIndex ? sheetOrdinal === targetIndex : false;

        const shouldProcessSheet = processAll
          ? true
          : normalizedSelector
            ? matchesByName || matchesByIndex
            : sheetOrdinal === 1;

        if (!shouldProcessSheet) {
          continue;
        }

        if (normalizedSelector) {
          matchedRequestedSheet = true;
        }

        const rows: string[] = [];
        sheet.eachRow((row) => {
          const csvRow = this.rowValuesToCsv(row.values);
          if (csvRow.length > 0) {
            rows.push(csvRow);
          }
        });

        if (rows.length > 0) {
          blocks.push(`--- Hoja: ${sheetName} ---`);
          blocks.push(rows.join('\n'));
          blocks.push('');
        }

        if (!processAll) {
          break;
        }
      }

      if (normalizedSelector && !matchedRequestedSheet) {
        throw new Error(
          `No se encontro la hoja solicitada: ${normalizedSelector}`,
        );
      }

      const extractedText = blocks.join('\n').trim();
      if (!extractedText) {
        throw new Error('El archivo Excel no contiene filas legibles');
      }

      return extractedText;
    }

    const workbookReader = new WorkbookReader(filePath, {
      entries: 'emit',
      sharedStrings: 'cache',
      hyperlinks: 'ignore',
      styles: 'ignore',
      worksheets: 'emit',
    });

    const normalizedSelector = preferredSheet?.trim();
    const targetIndex =
      normalizedSelector && /^\d+$/.test(normalizedSelector)
        ? Number(normalizedSelector)
        : undefined;
    const targetName =
      normalizedSelector && !/^\d+$/.test(normalizedSelector)
        ? normalizedSelector.toLowerCase()
        : undefined;
    const processAll = this.processAllSheetsByDefault && !normalizedSelector;

    const blocks: string[] = [];
    let sheetOrdinal = 0;
    let matchedRequestedSheet = false;

    for await (const worksheet of workbookReader) {
      const worksheetReader = worksheet as {
        name?: string;
        [Symbol.asyncIterator](): AsyncIterator<{ values: unknown[] }>;
      };

      sheetOrdinal += 1;
      const sheetName = worksheetReader.name ?? `Sheet${sheetOrdinal}`;
      const matchesByName = targetName
        ? sheetName.toLowerCase() === targetName
        : false;
      const matchesByIndex = targetIndex ? sheetOrdinal === targetIndex : false;

      const shouldProcessSheet = processAll
        ? true
        : normalizedSelector
          ? matchesByName || matchesByIndex
          : sheetOrdinal === 1;

      const rows: string[] = [];
      for await (const row of worksheetReader) {
        if (!shouldProcessSheet) {
          continue;
        }

        const csvRow = this.rowValuesToCsv(row.values);
        if (csvRow.length > 0) {
          rows.push(csvRow);
        }
      }

      if (!shouldProcessSheet) {
        continue;
      }

      if (normalizedSelector) {
        matchedRequestedSheet = true;
      }

      if (rows.length > 0) {
        blocks.push(`--- Hoja: ${sheetName} ---`);
        blocks.push(rows.join('\n'));
        blocks.push('');
      }

      if (!processAll) {
        break;
      }
    }

    if (normalizedSelector && !matchedRequestedSheet) {
      throw new Error(
        `No se encontro la hoja solicitada: ${normalizedSelector}`,
      );
    }

    const extractedText = blocks.join('\n').trim();
    if (!extractedText) {
      throw new Error('El archivo Excel no contiene filas legibles');
    }

    return extractedText;
  }

  private async extractWithXlsxLibrary(
    filePath: string,
    preferredSheet?: string,
  ): Promise<string> {
    const XLSX = await this.loadXlsxModule();
    const workbook = XLSX.readFile(filePath);
    let extractedText = '';
    const normalizedSelector = preferredSheet?.trim();
    const targetIndex =
      normalizedSelector && /^\d+$/.test(normalizedSelector)
        ? Number(normalizedSelector)
        : undefined;
    const targetName =
      normalizedSelector && !/^\d+$/.test(normalizedSelector)
        ? normalizedSelector.toLowerCase()
        : undefined;

    const selectedSheetNames = this.processAllSheetsByDefault && !normalizedSelector
      ? workbook.SheetNames
      : workbook.SheetNames.filter((sheetName: string, index: number) => {
          if (!normalizedSelector) {
            return index === 0;
          }
          if (targetIndex) {
            return index + 1 === targetIndex;
          }
          return sheetName.toLowerCase() === targetName;
        });

    if (normalizedSelector && selectedSheetNames.length === 0) {
      throw new Error(`No se encontro la hoja solicitada: ${normalizedSelector}`);
    }

    for (const sheetName of selectedSheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const csvData = XLSX.utils.sheet_to_csv(sheet);
      if (csvData.trim().length > 0) {
        extractedText += `--- Hoja: ${sheetName} ---\n${csvData}\n\n`;
      }
    }

    const normalized = extractedText.trim();
    if (!normalized) {
      throw new Error('El archivo Excel no contiene filas legibles');
    }

    return normalized;
  }

  private async extractFromLegacySpreadsheet(
    filePath: string,
    preferredSheet?: string,
  ): Promise<string> {
    try {
      return this.extractWithXlsxLibrary(filePath, preferredSheet);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error extracting legacy spreadsheet from ${filePath}: ${errorMsg}`);
      throw new Error(`Failed to extract .xls file: ${errorMsg}`);
    }
  }
}
