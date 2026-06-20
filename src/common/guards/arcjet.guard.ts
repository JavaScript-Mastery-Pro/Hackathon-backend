import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ARCJET } from '@arcjet/nest';
import type { ArcjetNest, Primitive, Product } from '@arcjet/nest';
import type { Request, Response } from 'express';
import { ARCJET_RULES } from '@/common/decorators/arcjet-rules.decorator';

/**
 * Runs Arcjet's `protect()` on every request.
 *
 * Registered as a global `APP_GUARD`, so the global rules (shield + bot
 * detection) apply everywhere, and routes can opt into extra rules with
 * `@ArcjetRules(...)`. Unlike the SDK's built-in `ArcjetGuard` — which collapses
 * every denial into a generic 403 — this maps the denial reason to the right
 * HTTP response (429 + `Retry-After` for rate limits, 403 for bots/shield).
 */
@Injectable()
export class ArcjetGuard implements CanActivate {
  private readonly logger = new Logger(ArcjetGuard.name);

  constructor(
    @Inject(ARCJET) private readonly arcjet: ArcjetNest,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Merge any route-/controller-level rules on top of the global client.
    const extraRules =
      this.reflector.getAllAndOverride<Array<Primitive | Product>>(
        ARCJET_RULES,
        [context.getHandler(), context.getClass()],
      ) ?? [];

    const aj = extraRules.reduce((client, rule) => client.withRule(rule), this.arcjet);

    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    const decision = await aj.protect(request);

    if (decision.isErrored()) {
      // Fail open: don't take the app down if Arcjet is unreachable.
      this.logger.warn(`Arcjet error, allowing request: ${decision.reason.message}`);
      return true;
    }

    if (decision.isDenied()) {
      if (decision.reason.isRateLimit()) {
        response.setHeader('Retry-After', String(decision.reason.reset));
        throw new HttpException(
          'Too many requests. Please slow down and try again later.',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      if (decision.reason.isBot()) {
        throw new ForbiddenException('Automated traffic is not allowed.');
      }

      // Shield (SQLi/XSS) and any other denial reason.
      throw new ForbiddenException('Request blocked for security reasons.');
    }

    return true;
  }
}
