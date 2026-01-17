import 'dotenv/config';
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { PrismaService } from './src/lib/database/prisma.service';

const prisma = new PrismaService();

export const auth = betterAuth({
  url: process.env.BACKEND_URL,
  secret: process.env.AUTH_SECRET,
  basePath: '/api/auth',
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  emailAndPassword: { enabled: true },
  user: {
    additionalFields: {
      role: {
        type: 'string',
        defaultValue: 'PARTICIPANT',
      },
    },
  },
});
