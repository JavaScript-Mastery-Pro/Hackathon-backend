import { Request } from 'express';
import type { Session } from 'better-auth';
import type { User } from '@/prisma/client';

declare global {
  namespace Express {
    interface Request {
      user?: User;
      session?: Session;
    }
  }
}
