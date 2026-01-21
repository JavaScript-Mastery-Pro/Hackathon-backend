import { Module } from '@nestjs/common';
import { ArcjetModule, detectBot, shield, slidingWindow } from '@arcjet/nest';

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
})
export class ArcjetSecurityModule {}
