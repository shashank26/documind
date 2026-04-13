import 'dotenv/config';

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing required env: ${name}`);
  }
  return value;
}

export const Config = {
  DB: requireEnv('DATABASE_URL') as string,
  DB_USER: requireEnv('DATABASE_USER') as string,
  ACCESS_KEY: requireEnv('AWS_ACCESS_KEY') as string,
  SECRET_KEY: requireEnv('AWS_SECRET_KEY') as string,
  REGION: requireEnv('AWS_REGION') as string,
  BUCKET: requireEnv('AWS_S3_BUCKET') as string,
  REDIS_HOST: requireEnv('REDIS_HOST') as string,
  REDIS_PORT: Number(requireEnv('REDIS_PORT')),
  REDIS_PASSWORD: requireEnv('REDIS_PASSWORD') as string,
  DEBUG: process.env.DEBUG === '1',
  GEMENI_API_KEY: requireEnv('GEMENI_API_KEY') as string,
};
