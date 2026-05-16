import 'dotenv/config';

export const config = {
  port: parseInt(process.env.API_PORT ?? '4000', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  databaseUrl: process.env.DATABASE_URL!,
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET ?? 'dev-access-secret-change-in-prod',
    refreshSecret: process.env.JWT_REFRESH_SECRET ?? 'dev-refresh-secret-change-in-prod',
    accessExpiry: '7d',
    refreshExpiry: '30d',
  },
  gemini: {
    apiKey: process.env.GEMINI_API_KEY!,
    model: process.env.GEMINI_MODEL ?? 'gemma-4-26b-a4b-it',
  },
  groq: {
    apiKey: process.env.GROQ_API_KEY!,
    model: process.env.GROQ_MODEL ?? 'llama-3.3-70b-versatile',
  },
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY!,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
  },
  cors: {
    origin: process.env.NODE_ENV === 'production'
      ? ['https://blueprint.app']
      : ['http://localhost:3000'],
  },
  rateLimit: {
    standard: 1000,
    ai: 100,
  },
} as const;
