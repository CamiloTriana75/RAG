import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';

@Injectable()
export class HealthService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {}

  async check() {
    const database = await this.checkDatabase();
    const openRouterConfigured = Boolean(
      this.configService.get<string>('OPENROUTER_API_KEY')?.trim(),
    );

    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      services: {
        database: {
          status: database ? 'up' : 'down',
        },
        openrouter: {
          status: openRouterConfigured ? 'configured' : 'missing',
        },
        ai: {
          status: openRouterConfigured ? 'up' : 'degraded',
          type: 'openrouter + xenova',
        },
      },
    };
  }

  private async checkDatabase(): Promise<boolean> {
    try {
      await this.dataSource.query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }
}
