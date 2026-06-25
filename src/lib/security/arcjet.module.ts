import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import {
  ArcjetGuard,
  ArcjetModule,
  detectBot,
  shield,
  slidingWindow,
} from '@arcjet/nest';

@Module({
  imports: [
    ArcjetModule.forRoot({
      isGlobal: true,
      key: process.env.ARCJET_KEY!, // Get this from your .env file
      rules: [
        // 1. Bot Protection
        detectBot({
          mode: 'LIVE',
          allow: [
            'CATEGORY:SEARCH_ENGINE',
            'CATEGORY:PREVIEW', // Link previews e.g. Slack, Discord
          ],
        }),
        // 2. Shield (SQL Injection, XSS protection)
        shield({ mode: 'LIVE' }),
        // 3. Rate Limiting (e.g., 10 requests per minute)
        slidingWindow({
          mode: 'LIVE',
          interval: '2s', // Refill every 2 seconds
          max: 5, // Allow 5 requests per interval
        }),
      ],
    }),
  ],
  // Register ArcjetGuard globally so the rules above run on every matched
  // route (it's route-scoped via canActivate, not Express middleware, so it
  // never fires on static assets). Layer extra per-route rules where needed
  // with the `@WithArcjetRules([...])` decorator on a controller or handler.
  providers: [{ provide: APP_GUARD, useClass: ArcjetGuard }],
})
export class ArcjetSecurityModule {}
