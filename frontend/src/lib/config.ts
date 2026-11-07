// NEXT_PUBLIC_ variables are inlined at build time, so they must be read with
// their full literal name.
const apiUrl = process.env.NEXT_PUBLIC_API_URL;

if (!apiUrl) {
  throw new Error('Missing environment variable: NEXT_PUBLIC_API_URL');
}

export const API_URL = apiUrl.replace(/\/$/, '');

export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;
