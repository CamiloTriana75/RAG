import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

interface ChatOptions {
  preferSmartModel?: boolean;
  systemHint?: string;
}

@Injectable()
export class AiService implements OnModuleInit {
  private readonly logger = new Logger(AiService.name);
  private readonly openRouterApiKey: string | undefined;
  private readonly openRouterModels: string[];
  private readonly openRouterSmartModel?: string;
  private readonly openRouterFallbackModels: string[] = [
    'openai/gpt-4o-mini',
    'openai/gpt-3.5-turbo',
    'anthropic/claude-3.5-sonnet',
  ];
  private readonly openRouterReferer: string;
  private readonly openRouterTitle: string;

  // Pipeline for HuggingFace Transformers (Local Embeddings)
  private featureExtractionPipeline: any;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.openRouterApiKey = this.configService.get<string>('OPENROUTER_API_KEY');
    this.openRouterModels = this.configService
      .get<string>('OPENROUTER_MODELS')
      ?.split(',')
      .map((model) => model.trim())
      .filter(Boolean) ?? [
      'meta-llama/llama-3.2-3b-instruct:free',
      'meta-llama/llama-3.3-70b-instruct:free',
      'qwen/qwen3-coder:free',
    ];
    this.openRouterSmartModel = this.configService
      .get<string>('OPENROUTER_SMART_MODEL')
      ?.trim();
    this.openRouterReferer = this.configService.get<string>(
      'OPENROUTER_REFERER',
      'https://github.com/CamiloTriana75/RAG-Backend',
    );
    this.openRouterTitle = this.configService.get<string>(
      'OPENROUTER_TITLE',
      'NestJS RAG Backend',
    );
  }

  async onModuleInit() {
    this.logger.log('Inicializando IA Serverless...');
    
    // 1. Verificar OpenRouter
    if (!this.openRouterApiKey || this.openRouterApiKey.trim() === '') {
      this.logger.warn('OPENROUTER_API_KEY no encontrada. El chat RAG no estará disponible hasta configurarla.');
    } else {
      this.logger.log(`OpenRouter configurado para chat con ${this.openRouterModels[0]}`);
    }

    // 2. Inicializar Embeddings Locales (Xenova / Transformers.js)
    try {
      this.logger.log('⏳ Cargando modelo matemático local para Embeddings (all-MiniLM-L6-v2)...');
      // Importación dinámica porque transformers es CommonJS/ESM
      const { pipeline } = await import('@xenova/transformers');
      this.featureExtractionPipeline = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
      this.logger.log('✅ Modelo de Embeddings local cargado exitosamente. (Dimensión: 384)');
    } catch (error: any) {
      this.logger.error(`❌ Falla al cargar el modelo de Embeddings JS: ${error.message}`);
    }
  }

  /**
   * Generar vector matemático a partir del texto localmente en Node.js
   * Dimensión del vector resultante es 384.
   */
  async generateEmbedding(text: string): Promise<number[]> {
    if (!this.featureExtractionPipeline) {
      throw new Error('El motor de embeddings no está inicializado.');
    }

    try {
      // { pooling: "mean", normalize: true } crea sentence embeddings correctos
      const output = await this.featureExtractionPipeline(text, {
        pooling: 'mean',
        normalize: true,
      });
      return Array.from(output.data);
    } catch (error: any) {
      this.logger.error(`Error generando embedding local: ${error.message}`);
      throw new Error('Fallo en la generación de Embedding Local');
    }
  }

  /**
   * Generar múltiples embeddings (array de chunks).
   */
  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    const results: number[][] = [];
    for (const text of texts) {
      const vector = await this.generateEmbedding(text);
      results.push(vector);
    }
    return results;
  }

  /**
   * Esperar con backoff exponencial (usado para rate limits)
   */
  private async waitWithBackoff(attemptNumber: number): Promise<void> {
    const delayMs = Math.pow(2, attemptNumber) * 1000 + Math.random() * 1000;
    this.logger.log(`⏳ Rate limit detectado. Esperando ${Math.round(delayMs / 1000)}s antes de reintentar...`);
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  /**
   * Chat completion usando la nube de OpenRouter
   */
  async chat(
    question: string,
    context: string,
    options: ChatOptions = {},
  ): Promise<string> {
    if (!this.openRouterApiKey) {
      throw new Error('No OPENROUTER_API_KEY configurada.');
    }

    // ── Build the enhanced system prompt ──────────────
    const hintBlock = options.systemHint
      ? `\n\nINSTRUCCIÓN ESPECÍFICA DEL USUARIO (sigue esto como directriz principal de formato y enfoque):\n${options.systemHint}`
      : '';

    const messages = [
      {
        role: 'system',
        content: `Eres **Cognitive Architect**, un analista documental experto con capacidades avanzadas de razonamiento y síntesis.

## Tu método de trabajo (sigue SIEMPRE estos pasos internamente):
1. **Comprende la solicitud**: Analiza qué pide el usuario — ¿resumen?, ¿extracción de datos?, ¿validación?, ¿comparación?, ¿checklist?
2. **Examina cada fragmento del CONTEXTO**: Identifica datos relevantes, cifras, fechas, nombres, relaciones y patrones.
3. **Razona paso a paso**: Antes de responder, conecta los hallazgos entre sí, detecta posibles inconsistencias o vacíos.
4. **Genera una respuesta estructurada**: Usa el formato más adecuado (viñetas, tablas markdown, listas numeradas, etc.) según lo que se pide.

## Reglas de calidad:
- **Exhaustividad**: Cubre todos los puntos relevantes del contexto. No omitas información importante.
- **Precisión**: Cita datos textuales cuando sea posible. Incluye cifras, fechas y nombres exactos.
- **Estructura**: Usa encabezados (##), viñetas (-), tablas markdown y negritas (**) para una lectura clara y profesional.
- **Anti-alucinación**: Si la información solicitada NO está en el contexto, dilo claramente. Indica qué sí encontraste y sugiere reformular.
- **Estilo directo**: No incluyas preámbulos, saludos ni explicaciones sobre lo que vas a hacer. Empieza directamente con el contenido solicitado.
- **Idioma**: Responde siempre en español.
- **Tono**: Profesional, analítico y directo. Evita relleno innecesario.

## Cuando el contexto es insuficiente:
Responde: "No encontré información específica sobre [tema] en los documentos proporcionados. Sin embargo, encontré esto que podría ser útil: [resumen de lo más cercano]."${hintBlock}

## CONTEXTO DOCUMENTAL (fragmentos recuperados por relevancia semántica):
${context}`,
      },
      {
        role: 'user',
        content: question,
      },
    ];

    let lastError: any;
    let retryCount = 0;
    const MAX_RETRIES = 1;
    const modelCandidates = options.preferSmartModel && this.openRouterSmartModel
      ? [
          this.openRouterSmartModel,
          ...this.openRouterModels,
          ...this.openRouterFallbackModels,
        ]
      : [...this.openRouterModels, ...this.openRouterFallbackModels];
    const allModelsToTry = Array.from(new Set(modelCandidates));

    for (let attempt = 0; attempt < allModelsToTry.length; attempt++) {
      const model = allModelsToTry[attempt];
      const isPaidModel = this.openRouterFallbackModels.includes(model);

      try {
        const response = await firstValueFrom(
          this.httpService.post(
            'https://openrouter.ai/api/v1/chat/completions',
            {
              model: model,
              messages,
              temperature: options.systemHint ? 0.05 : 0.15,
              max_tokens: options.systemHint ? 2400 : 1200,
            },
            {
              headers: {
                Authorization: `Bearer ${this.openRouterApiKey}`,
                'HTTP-Referer': this.openRouterReferer,
                'X-Title': this.openRouterTitle,
                'Content-Type': 'application/json',
              },
              timeout: 60000,
            }
          )
        );
        
        const content = response.data?.choices?.[0]?.message?.content;
        if (typeof content === 'string' && content.trim().length > 0) {
          this.logger.log(
            `✅ Chat completado exitosamente con ${model}${options.preferSmartModel ? ' (smart-mode)' : ''}`,
          );
          return content;
        }

        throw new Error(`OpenRouter respondió sin contenido para el modelo ${model}`);
        
      } catch (error: any) {
        const status = error?.response?.status;
        const message = error?.response?.data?.error?.message || error?.message || 'Error desconocido';

        // 401/403 indican problema de credenciales a nivel de cuenta/API key;
        // reintentar con otros modelos no ayuda.
        if (status === 401 || status === 403) {
          this.logger.error(
            `Autenticacion OpenRouter invalida (${status}): ${message}. Revisa OPENROUTER_API_KEY en backend/.env`,
          );
          lastError = error;
          break;
        }

        // Si es rate limit en modelo free y aún no hemos reintentado, espera antes de siguiente
        if (status === 429 && retryCount < MAX_RETRIES && !isPaidModel) {
          this.logger.warn(`Rate limit (429) en ${model}. Esperando antes de reintentar...`);
          retryCount++;
          await this.waitWithBackoff(retryCount);
          attempt--; // Reintenta con el mismo modelo
          continue;
        }

        if (status === 429) {
          this.logger.warn(`Rate limit (429) en ${model}. Cambiando a siguiente modelo...`);
        } else if (isPaidModel) {
          this.logger.error(`Modelo de pago ${model} falló (${status}): ${message}`);
        } else {
          this.logger.warn(`Modelo free ${model} falló (${status}): ${message}`);
        }

        lastError = error;
      }
    }

    // Si terminó el bucle y todos fallaron, devolvemos una respuesta degradada
    const finalErrorMessage = lastError?.response?.data?.error?.message || lastError?.message || 'Error desconocido';
    this.logger.error(`OpenRouter falló después de intentar todos los modelos: ${finalErrorMessage}`);

    if (lastError?.response?.status === 401 || lastError?.response?.status === 403) {
      return (
        'OpenRouter rechazó la autenticación de este backend (credenciales inválidas). ' +
        'Mientras se corrige la API key, revisa las fuentes recuperadas abajo para ver el contexto encontrado.'
      );
    }

    return (
      'No pude generar una respuesta final con OpenRouter en este momento. ' +
      'Sin embargo, recuperé fragmentos relevantes de tus documentos en la sección de fuentes. ' +
      'Intenta de nuevo en unos segundos.'
    );
  }
}
