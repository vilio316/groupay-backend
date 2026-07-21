import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as dotenv from 'dotenv';

dotenv.config();
const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  }),
});

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 1 * 60 * 60,
    },
  },
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    google: {
      prompt: 'select_account',
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    },
  },
  user: {
    additionalFields: {
      phone: {
        type: 'string',
        required: false,
        defaultValue: '08044441123',
        input: true,
      },
      accountNumber: {
        type: 'string',
        required: false,
        defaultValue: '1234567890',
        input: true,
      },
      accountBalance: {
        type: 'number',
        required: false,
        defaultValue: 0,
        input: false,
      },
    },
  },
  trustedOrigins: [process.env.CLIENT_DEV_URL as string],
  advanced: {
    disableOriginCheck: true,
    defaultCookieAttributes: {
      sameSite: 'none',
      secure: true,
      httpOnly: true,
    },
  },
});
