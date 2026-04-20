import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SupabaseStorageService } from './supabase.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [SupabaseStorageService],
  exports: [SupabaseStorageService],
})
export class SupabaseModule {}