import { neon, neonConfig } from '@neondatabase/serverless';

// Neon Serverless Postgres Client
// Defaults to the production Neon project from .neon config if DATABASE_URL is not set
const DEFAULT_DATABASE_URL =
  'postgresql://neondb_owner:npg_9Vad3jOmZivN@ep-rapid-silence-b2yb9trk-pooler.c-6.eu-central-1.aws.neon.tech/neondb?sslmode=require';

const connectionString = process.env.DATABASE_URL || DEFAULT_DATABASE_URL;

export const sql = neon(connectionString);
