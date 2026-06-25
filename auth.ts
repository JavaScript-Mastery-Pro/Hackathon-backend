// Load env before anything reads process.env. auth.ts is evaluated at import time
// (when AppModule pulls it in), which can be earlier than Nest's ConfigModule.
import 'dotenv/config';

import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './src/generated/prisma/client';

// Better Auth gets its own Prisma client (separate from the Nest PrismaService).
// Same driver adapter so it talks to the same Postgres database.
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  database: prismaAdapter(prisma, { provider: 'postgresql' }),
  emailAndPassword: {
    enabled: true,
  },
  user: {
    additionalFields: {
      // App role lives on the user row. `input: false` stops clients from
      // setting their own role at sign-up; everyone starts as PARTICIPANT.
      role: {
        type: 'string',
        defaultValue: 'PARTICIPANT',
        input: false,
      },
    },
  },
});
