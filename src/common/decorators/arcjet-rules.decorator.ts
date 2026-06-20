import { SetMetadata } from '@nestjs/common';
import type { Primitive, Product } from '@arcjet/nest';

export const ARCJET_RULES = 'arcjet:rules';

/**
 * Layer extra Arcjet rules onto a controller or route handler.
 *
 * The global `shield()` + `detectBot()` rules (see `arcjet.module.ts`) always
 * run; rules added here are merged in on top via `withRule()` — e.g. a stricter
 * rate limit on auth or file-upload endpoints.
 */
export const ArcjetRules = (...rules: Array<Primitive | Product>) =>
  SetMetadata(ARCJET_RULES, rules);
