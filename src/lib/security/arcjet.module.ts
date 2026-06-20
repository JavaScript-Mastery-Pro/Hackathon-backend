import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ArcjetModule, detectBot, shield } from '@arcjet/nest';
import { ArcjetGuard } from '@/common/guards/arcjet.guard';

@Module({
  imports: [
    ArcjetModule.forRootAsync({
      isGlobal: true,
      // forRootAsync resolves the key after ConfigModule has loaded .env,
      // avoiding the module-load timing issue with `process.env`.
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        key: config.getOrThrow<string>('ARCJET_KEY'),
        // Global base rules — applied to every request via ArcjetGuard.
        // Route-specific rate limits are layered on with `@ArcjetRules(...)`.
        rules: [
          // Shield: SQL injection, XSS and other common attacks.
          shield({ mode: 'LIVE' }),
          // Bot detection — allow legitimate automated traffic.
          detectBot({
            mode: 'LIVE',
            allow: [
              'CATEGORY:SEARCH_ENGINE',
              'CATEGORY:PREVIEW', // Link previews e.g. Slack, Discord
            ],
          }),
        ],
      }),
    }),
  ],
  providers: [
    // Apply Arcjet to every route. Runs before route-level guards
    // (e.g. JwtAuthGuard), so abuse is blocked before any auth work.
    { provide: APP_GUARD, useClass: ArcjetGuard },
  ],
})
export class ArcjetSecurityModule {}
