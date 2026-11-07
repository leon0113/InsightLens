import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });

// Fail at startup, not on the first request, if a required value is missing.
const required = (key: string): string => {
  const value = process.env[key];
  if (!value) throw new Error(`Missing environment variable: ${key}`);
  return value;
};

// Relative paths in .env are relative to the folder the server starts in.
const resolvePath = (value: string): string =>
  path.resolve(process.cwd(), value);

export default {
  NODE_ENV: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 5000),
  database_url: required('DATABASE_URL'),
  bcrypt_salt_rounds: Number(process.env.BCRYPT_SALT_ROUNDS || 11),
  cors_origins: (process.env.CORS_ORIGINS || '').split(',').filter(Boolean),
  jwt: {
    secret: required('JWT_SECRET'),
    expires_in: process.env.JWT_EXPIRES_IN || '1d',
    refresh_secret: required('JWT_REFRESH_SECRET'),
    refresh_expires_in: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  },
  analysis: {
    python_bin: resolvePath(required('PYTHON_BIN')),
    script_path: resolvePath(required('ANALYSIS_SCRIPT_PATH')),
    timeout_ms: Number(process.env.ANALYSIS_TIMEOUT_MS || 300000),
  },
  sample_data_dir: resolvePath(process.env.SAMPLE_DATA_DIR || '../sample-data'),
};
